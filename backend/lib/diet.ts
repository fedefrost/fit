import type { DietMeal, MealSlot, MealType, PrismaClient, Profile } from "@prisma/client";
import { dailyTargets, type DailyTargets } from "./nutrition";

export const GENERATED_SLOTS = ["breakfast", "lunch", "dinner"] as const satisfies readonly MealSlot[];
type GeneratedSlot = (typeof GENERATED_SLOTS)[number];

const SLOT_ORDER: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2, extra: 3 };

/** Máximo de comidas agregadas a mano ("Añadir") por día. */
export const MAX_EXTRAS_PER_DAY = 20;

// Porciones que puede ingresar el usuario (cualquier decimal, se guarda con 2 decimales)
// y las que usa el generador para acercarse al objetivo.
export const SERVINGS_RANGE = { min: 0.1, max: 10 } as const;
const GENERATED_SERVINGS_RANGE = { min: 0.5, max: 2.5 } as const;

// ---------- Fechas (siempre a medianoche UTC, que es como Prisma maneja @db.Date) ----------

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** "YYYY-MM-DD" válido → Date a medianoche UTC; si no, null. */
export function parseIsoDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || isoDate(date) !== raw ? null : date;
}

/**
 * La semana la define el cliente (su lunes en hora local), para no depender de la zona
 * horaria del servidor. Debe ser un lunes.
 */
export function parseWeekStart(raw: unknown): Date | null {
  const date = parseIsoDate(raw);
  return date && date.getUTCDay() === 1 ? date : null;
}

export function weekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, offset) => new Date(weekStart.getTime() + offset * 86_400_000));
}

export function isInWeek(date: Date, weekStart: Date) {
  const diff = (date.getTime() - weekStart.getTime()) / 86_400_000;
  return diff >= 0 && diff < 7;
}

/** Porciones entre SERVINGS_RANGE.min y .max, redondeadas a 2 decimales; si no, null. */
export function parseServings(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const servings = Math.round(raw * 100) / 100;
  return servings >= SERVINGS_RANGE.min && servings <= SERVINGS_RANGE.max ? servings : null;
}

// ---------- Respuesta de la API ----------

type MealWithRecipe = DietMeal & { recipe: { calories: number; waterMl: number } };

function toMealDto(meal: MealWithRecipe) {
  return {
    id: meal.id,
    slot: meal.slot,
    recipeId: meal.recipeId,
    servings: meal.servings,
    consumed: meal.consumed,
    calories: Math.round(meal.recipe.calories * meal.servings),
    waterMl: Math.round(meal.recipe.waterMl * meal.servings),
  };
}

/**
 * { weekStart, targets, plan } — `plan` es null si el perfil no tiene dieta para esa semana
 * (nunca la generó, o la que tiene es de otra semana: no se guarda historial).
 */
export async function buildDietResponse(prisma: PrismaClient, profile: Profile, weekStart: Date) {
  const targets = dailyTargets(profile);
  const plan = await prisma.dietPlan.findUnique({
    where: { profileId: profile.id },
    include: {
      meals: {
        include: { recipe: { select: { calories: true, waterMl: true } } },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!plan || isoDate(plan.weekStart) !== isoDate(weekStart)) {
    return { weekStart: isoDate(weekStart), targets, plan: null };
  }

  const days = weekDates(weekStart).map((date) => {
    const day = isoDate(date);
    const meals = plan.meals
      .filter((meal) => isoDate(meal.date) === day)
      .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot])
      .map(toMealDto);
    return { date: day, meals };
  });

  return { weekStart: isoDate(weekStart), targets, plan: { updatedAt: plan.updatedAt, days } };
}

// ---------- Generador ----------

export type RecipeForGeneration = {
  id: number;
  mealTypes: MealType[];
  calories: number;
  ingredientIds: number[];
};

type PlannedMeal = { date: Date; slot: GeneratedSlot; recipeId: number; servings: number };

/**
 * Elige desayuno, almuerzo y cena para cada fecha. Función pura (sin base de datos).
 * - Descarta recetas con algún alimento rechazado.
 * - Puntaje: +2 por cada alimento preferido; penaliza recetas cuyas calorías estén lejos del
 *   objetivo de esa comida (necesitarían porciones muy grandes o muy chicas) y las que ya se
 *   usaron en la semana; nunca repite receta en el mismo día. Un poco de azar da variedad.
 * - Las porciones se ajustan (de a 1/4) para acercarse a las calorías objetivo de la comida.
 * - `avoid`: recetas que tenían esas fechas antes de regenerar; se penalizan fuerte para que
 *   "regenerar" proponga algo distinto (sin excluirlas, por si no hay alternativas).
 * Si para una comida no queda ninguna receta compatible, esa comida queda vacía.
 */
export function planMeals(params: {
  recipes: RecipeForGeneration[];
  preferredIds: Set<number>;
  rejectedIds: Set<number>;
  targets: DailyTargets;
  dates: Date[];
  usage: Map<number, number>; // veces que ya aparece cada receta en el resto de la semana
  avoid?: Set<number>;
  random?: () => number;
}): PlannedMeal[] {
  const { recipes, preferredIds, rejectedIds, targets, dates, usage, avoid = new Set(), random = Math.random } = params;
  const allowed = recipes.filter((recipe) => recipe.calories > 0 && !recipe.ingredientIds.some((id) => rejectedIds.has(id)));
  const planned: PlannedMeal[] = [];

  for (const date of dates) {
    const usedToday = new Set<number>();

    for (const slot of GENERATED_SLOTS) {
      const target = targets.mealCalories[slot];
      const candidates = allowed.filter((recipe) => recipe.mealTypes.includes(slot) && !usedToday.has(recipe.id));
      if (candidates.length === 0) continue;

      let best = candidates[0];
      let bestScore = -Infinity;
      for (const recipe of candidates) {
        const preferred = recipe.ingredientIds.filter((id) => preferredIds.has(id)).length;
        const calorieFit = Math.abs(Math.log(target / recipe.calories));
        const repeats = usage.get(recipe.id) ?? 0;
        const replaced = avoid.has(recipe.id) ? 6 : 0;
        const score = preferred * 2 - calorieFit * 3 - repeats * 4 - replaced + random() * 1.5;
        if (score > bestScore) [best, bestScore] = [recipe, score];
      }

      const rawServings = Math.round((target / best.calories) * 4) / 4;
      const servings = Math.min(GENERATED_SERVINGS_RANGE.max, Math.max(GENERATED_SERVINGS_RANGE.min, rawServings));

      planned.push({ date, slot, recipeId: best.id, servings });
      usedToday.add(best.id);
      usage.set(best.id, (usage.get(best.id) ?? 0) + 1);
    }
  }

  return planned;
}

/**
 * Genera (o regenera) la dieta de la semana, o solo de `onlyDate`.
 * Reemplaza desayuno/almuerzo/cena de esas fechas; las comidas agregadas a mano se conservan.
 * Si el perfil tenía la dieta de otra semana, se borra (no se guarda historial).
 */
export async function generateDiet(prisma: PrismaClient, profile: Profile, weekStart: Date, onlyDate?: Date) {
  const targets = dailyTargets(profile);
  const [recipes, preferences] = await Promise.all([
    prisma.recipe.findMany({ select: { id: true, mealTypes: true, calories: true, ingredients: { select: { foodId: true } } } }),
    prisma.profileFood.findMany({ where: { profileId: profile.id }, select: { foodId: true, preference: true } }),
  ]);

  const recipesForGeneration = recipes.map(({ ingredients, ...recipe }) => ({
    ...recipe,
    ingredientIds: ingredients.map((ingredient) => ingredient.foodId),
  }));
  const preferredIds = new Set(preferences.filter((p) => p.preference === "preferred").map((p) => p.foodId));
  const rejectedIds = new Set(preferences.filter((p) => p.preference === "rejected").map((p) => p.foodId));
  const dates = onlyDate ? [onlyDate] : weekDates(weekStart);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.dietPlan.findUnique({ where: { profileId: profile.id } });
    if (existing && isoDate(existing.weekStart) !== isoDate(weekStart)) {
      await tx.dietPlan.delete({ where: { id: existing.id } });
    }
    const plan = await tx.dietPlan.upsert({
      where: { profileId: profile.id },
      create: { profileId: profile.id, weekStart },
      update: { weekStart },
    });

    const others = await tx.dietMeal.findMany({
      where: { planId: plan.id, slot: { in: [...GENERATED_SLOTS] }, date: { notIn: dates } },
      select: { recipeId: true },
    });
    const usage = new Map<number, number>();
    for (const { recipeId } of others) usage.set(recipeId, (usage.get(recipeId) ?? 0) + 1);

    const replacedWhere = { planId: plan.id, slot: { in: [...GENERATED_SLOTS] }, date: { in: dates } };
    const replaced = await tx.dietMeal.findMany({ where: replacedWhere, select: { recipeId: true } });
    await tx.dietMeal.deleteMany({ where: replacedWhere });

    const avoid = new Set(replaced.map((meal) => meal.recipeId));
    const meals = planMeals({ recipes: recipesForGeneration, preferredIds, rejectedIds, targets, dates, usage, avoid });
    await tx.dietMeal.createMany({ data: meals.map((meal) => ({ planId: plan.id, ...meal })) });
  });
}
