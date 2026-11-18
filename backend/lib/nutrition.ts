import type { ActivityLevel, Profile } from "@prisma/client";

// Factores de actividad estándar sobre el gasto basal (TDEE = BMR × factor).
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Agua extra por actividad (ml/día), sobre la base de 35 ml por kg.
const ACTIVITY_WATER_ML: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};

/** Reparto de las calorías del día entre las 3 comidas generadas. */
export const MEAL_SPLIT = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const;

export type DietGoal = "lose" | "maintain" | "gain";

export type DailyTargets = {
  calories: number; // kcal/día objetivo
  waterMl: number; // agua/día recomendada
  goal: DietGoal;
  bmr: number; // gasto basal estimado
  tdee: number; // gasto total estimado con actividad
  mealCalories: Record<keyof typeof MEAL_SPLIT, number>;
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/**
 * Objetivos diarios estimados para un perfil.
 * - Gasto basal con Mifflin-St Jeor (para sexo "other" se usa el promedio de ambas constantes).
 * - Adultos con sobrepeso u obesidad: déficit del 15 % / 25 %; con bajo peso: superávit del 10 %.
 *   En menores de 18 no se aplica déficit ni superávit.
 * - Nunca por debajo de 1200 kcal (1500 en hombres), salvo que el gasto estimado sea menor.
 * Es una estimación orientativa, no reemplaza el consejo de un profesional de la salud.
 */
/** Gasto basal (kcal/día) con Mifflin-St Jeor; para sexo "other", promedio de ambas constantes. */
export function basalMetabolicRate(profile: Pick<Profile, "weight" | "height" | "age" | "sex">) {
  const { weight, height, age, sex } = profile;
  const sexConstant = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return 10 * weight + 6.25 * height - 5 * age + sexConstant;
}

export function dailyTargets(profile: Pick<Profile, "weight" | "height" | "age" | "sex" | "activityLevel">): DailyTargets {
  const { weight, height, age, sex, activityLevel } = profile;
  const bmr = basalMetabolicRate(profile);
  const tdee = bmr * ACTIVITY_FACTOR[activityLevel];

  const bmi = weight / (height / 100) ** 2;
  let goal: DietGoal = "maintain";
  let factor = 1;
  if (age >= 18) {
    if (bmi >= 30) [goal, factor] = ["lose", 0.75];
    else if (bmi >= 25) [goal, factor] = ["lose", 0.85];
    else if (bmi < 18.5) [goal, factor] = ["gain", 1.1];
  }

  const floor = Math.min(sex === "male" ? 1500 : 1200, tdee);
  const calories = roundTo(Math.max(tdee * factor, floor), 10);
  const waterMl = Math.min(4500, Math.max(1500, roundTo(35 * weight + ACTIVITY_WATER_ML[activityLevel], 50)));

  return {
    calories,
    waterMl,
    goal,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    mealCalories: {
      breakfast: Math.round(calories * MEAL_SPLIT.breakfast),
      lunch: Math.round(calories * MEAL_SPLIT.lunch),
      dinner: Math.round(calories * MEAL_SPLIT.dinner),
    },
  };
}
