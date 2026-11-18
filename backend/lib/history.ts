import type { PrismaClient, Profile } from "@prisma/client";
import { isoDate } from "./diet";
import { caloriesBurned } from "./exercise";
import { dailyTargets } from "./nutrition";

/** "YYYY-MM" válido → primer día del mes (medianoche UTC); si no, null. */
export function parseMonth(raw: unknown): Date | null {
  if (typeof raw !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return null;
  const [year, month] = raw.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;
  return new Date(Date.UTC(year, month - 1, 1));
}

/**
 * Historial de un mes: solo los días con dieta o entrenamiento registrados.
 * { month, days: [{ date, targets, consumed, plannedCalories, meals, workout }] }
 * - targets: lo recomendado esa semana (copiado en la dieta); si es una dieta antigua sin copia,
 *   se calcula con los datos actuales del perfil.
 * - meals: todas las comidas del día (el frontend muestra las consumidas).
 * - workout: ejercicios del día con sus calorías (estimadas con los datos actuales del perfil).
 */
export async function buildHistoryResponse(prisma: PrismaClient, profile: Profile, monthStart: Date) {
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const range = { gte: monthStart, lt: monthEnd };

  const [meals, workoutDays] = await Promise.all([
    prisma.dietMeal.findMany({
      where: { plan: { profileId: profile.id }, date: range },
      include: {
        recipe: { select: { calories: true, waterMl: true } },
        plan: { select: { targetCalories: true, targetWaterMl: true, baselineBurn: true } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.workoutDay.findMany({
      where: { profileId: profile.id, date: range },
      include: { entries: { include: { exercise: true }, orderBy: { id: "asc" } } },
    }),
  ]);

  const live = dailyTargets(profile);
  const SLOT_ORDER = { breakfast: 0, lunch: 1, dinner: 2, extra: 3 } as const;
  const dates = [...new Set([...meals.map((meal) => isoDate(meal.date)), ...workoutDays.map((day) => isoDate(day.date))])].sort();

  return {
    month: isoDate(monthStart).slice(0, 7),
    days: dates.map((date) => {
      const dayMeals = meals
        .filter((meal) => isoDate(meal.date) === date)
        .sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
      const plan = dayMeals[0]?.plan;
      const mealDtos = dayMeals.map((meal) => ({
        id: meal.id,
        slot: meal.slot,
        recipeId: meal.recipeId,
        servings: meal.servings,
        consumed: meal.consumed,
        calories: Math.round(meal.recipe.calories * meal.servings),
        waterMl: Math.round(meal.recipe.waterMl * meal.servings),
      }));
      const consumed = mealDtos.filter((meal) => meal.consumed);

      const workoutDay = workoutDays.find((day) => isoDate(day.date) === date);
      const exercises = (workoutDay?.entries ?? []).map((entry) => ({
        id: entry.id,
        exerciseId: entry.exerciseId,
        minutes: entry.minutes,
        sets: entry.sets,
        reps: entry.reps,
        weightKg: entry.weightKg,
        done: entry.done,
        calories: caloriesBurned(entry.exercise, entry, profile),
      }));

      return {
        date,
        targets: plan
          ? {
              calories: plan.targetCalories ?? live.calories,
              waterMl: plan.targetWaterMl ?? live.waterMl,
              baselineBurn: plan.baselineBurn ?? live.baselineBurn,
            }
          : null,
        consumed: {
          calories: consumed.reduce((total, meal) => total + meal.calories, 0),
          waterMl: consumed.reduce((total, meal) => total + meal.waterMl, 0),
        },
        plannedCalories: mealDtos.reduce((total, meal) => total + meal.calories, 0),
        meals: mealDtos,
        workout: workoutDay
          ? {
              location: workoutDay.location,
              muscles: workoutDay.muscles,
              burned: exercises.filter((entry) => entry.done).reduce((total, entry) => total + entry.calories, 0),
              exercises,
            }
          : null,
        baselineBurn: plan?.baselineBurn ?? live.baselineBurn,
      };
    }),
  };
}
