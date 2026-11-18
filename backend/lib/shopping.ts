import type { PrismaClient, Profile, RecipeUnit, ShoppingList } from "@prisma/client";
import { GENERATED_SLOTS, isoDate, weekDates } from "./diet";

export const PEOPLE_RANGE = { min: 1, max: 20 } as const;
/** Máximo de artículos agregados a mano por lista. */
export const MAX_SHOPPING_ITEMS = 100;
export const MAX_ITEM_TEXT = 80;

/** Clave estable de un ingrediente de la dieta en la lista: "<foodId>:<unidad>". */
export const ingredientKey = (foodId: number, unit: RecipeUnit) => `${foodId}:${unit}`;

/** Días válidos: enteros 0 (lunes) a 6 (domingo), sin repetir y ordenados. null si no es válido. */
export function parseDays(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return null;
  return [...new Set(raw as number[])].sort((a, b) => a - b);
}

export function parsePeople(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw >= PEOPLE_RANGE.min && raw <= PEOPLE_RANGE.max
    ? raw
    : null;
}

/** Texto opcional recortado; undefined si no vino, null si vino vacío, false si es inválido. */
export function parseOptionalText(raw: unknown): string | null | undefined | false {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== "string") return false;
  const text = raw.trim();
  if (text.length > MAX_ITEM_TEXT) return false;
  return text || null;
}

/**
 * Lista del perfil para esa semana, creándola si hace falta. Si la guardada es de otra semana se
 * vacía (marcas, artículos y días) y se conserva la cantidad de personas.
 */
export async function ensureList(prisma: PrismaClient, profileId: number, weekStart: Date): Promise<ShoppingList> {
  const existing = await prisma.shoppingList.findUnique({ where: { profileId } });
  if (!existing) return prisma.shoppingList.create({ data: { profileId, weekStart } });
  if (isoDate(existing.weekStart) === isoDate(weekStart)) return existing;

  const [, , list] = await prisma.$transaction([
    prisma.shoppingCheck.deleteMany({ where: { listId: existing.id } }),
    prisma.shoppingItem.deleteMany({ where: { listId: existing.id } }),
    prisma.shoppingList.update({ where: { id: existing.id }, data: { weekStart, days: [] } }),
  ]);
  return list;
}

/**
 * { weekStart, people, days, hasDiet, ingredients, items }
 * - ingredients: suma de los ingredientes de desayuno, almuerzo y cena del plan en los días
 *   elegidos, × porciones × personas. Las comidas agregadas a mano no cuentan (ya se comieron).
 * - items: lo agregado a mano.
 */
export async function buildShoppingResponse(prisma: PrismaClient, profile: Profile, weekStart: Date) {
  const week = isoDate(weekStart);
  const stored = await prisma.shoppingList.findUnique({
    where: { profileId: profile.id },
    include: { checks: true, items: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
  });
  const list = stored && isoDate(stored.weekStart) === week ? stored : null;
  const people = stored?.people ?? 1;
  const days = list?.days ?? [];
  const checked = new Set(list?.checks.map((check) => check.key) ?? []);

  const plan = await prisma.dietPlan.findUnique({
    where: { profileId_weekStart: { profileId: profile.id, weekStart } },
  });
  const hasDiet = Boolean(plan);

  const ingredients = new Map<string, { key: string; foodId: number; unit: RecipeUnit; quantity: number; meals: number }>();
  if (plan && hasDiet) {
    const dates = weekDates(weekStart).filter((_date, index) => days.length === 0 || days.includes(index));
    const meals = await prisma.dietMeal.findMany({
      where: { planId: plan.id, date: { in: dates }, slot: { in: [...GENERATED_SLOTS] } },
      include: { recipe: { include: { ingredients: true } } },
    });
    for (const meal of meals) {
      for (const ingredient of meal.recipe.ingredients) {
        const key = ingredientKey(ingredient.foodId, ingredient.unit);
        const entry = ingredients.get(key) ?? { key, foodId: ingredient.foodId, unit: ingredient.unit, quantity: 0, meals: 0 };
        entry.quantity += ingredient.quantity * meal.servings * people;
        entry.meals += 1;
        ingredients.set(key, entry);
      }
    }
  }

  return {
    weekStart: week,
    people,
    days,
    hasDiet,
    ingredients: [...ingredients.values()].map((entry) => ({
      ...entry,
      quantity: Math.round(entry.quantity * 100) / 100,
      checked: checked.has(entry.key),
    })),
    items: (list?.items ?? []).map((item) => ({
      id: item.id,
      foodId: item.foodId,
      name: item.name,
      amount: item.amount,
      checked: item.checked,
    })),
  };
}
