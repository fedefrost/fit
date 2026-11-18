import type { ActivityLevel, Lifestyle, Profile } from "@prisma/client";

/**
 * Nivel de actividad física de un día normal SIN ejercicio, según la rutina diaria
 * (multiplica el gasto basal). Valores orientativos del tipo PAL (FAO/OMS) adaptados:
 * jornadas sentadas ≈ 1,25–1,3; de pie ≈ 1,45; trabajo físico ≈ 1,65.
 */
const LIFESTYLE_FACTOR: Record<Lifestyle, number> = {
  unemployed: 1.25,
  remote_work: 1.25,
  office: 1.3,
  student: 1.35,
  part_time: 1.35,
  standing_work: 1.45,
  physical_work: 1.65,
};

/** Cuánto suma el ejercicio habitual (nivel de actividad) al factor de la rutina diaria. */
const ACTIVITY_INCREMENT: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 0.1,
  moderate: 0.2,
  active: 0.35,
  very_active: 0.5,
};

// Agua extra (ml/día), sobre la base de 35 ml por kg.
const ACTIVITY_WATER_ML: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 250,
  moderate: 500,
  active: 750,
  very_active: 1000,
};
const LIFESTYLE_WATER_ML: Partial<Record<Lifestyle, number>> = { standing_work: 250, physical_work: 500 };

/** Reparto de las calorías del día entre las 3 comidas generadas. */
export const MEAL_SPLIT = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 } as const;

export type DietGoal = "lose" | "maintain" | "gain";

export type DailyTargets = {
  calories: number; // kcal/día objetivo de la dieta
  waterMl: number; // agua/día recomendada
  goal: DietGoal;
  bmr: number; // gasto basal estimado
  baselineBurn: number; // gasto de un día normal por la rutina diaria, sin ejercicio
  tdee: number; // gasto total estimado con el ejercicio habitual
  mealCalories: Record<keyof typeof MEAL_SPLIT, number>;
};

type ProfileStats = Pick<Profile, "weight" | "height" | "age" | "sex" | "activityLevel" | "lifestyle">;

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Gasto basal (kcal/día) con Mifflin-St Jeor; para sexo "other", promedio de ambas constantes. */
export function basalMetabolicRate(profile: Pick<Profile, "weight" | "height" | "age" | "sex">) {
  const { weight, height, age, sex } = profile;
  const sexConstant = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  return 10 * weight + 6.25 * height - 5 * age + sexConstant;
}

/** Gasto de un día normal sin ejercicio (gasto basal × factor de la rutina diaria). */
export function baselineBurn(profile: Pick<Profile, "weight" | "height" | "age" | "sex" | "lifestyle">) {
  return Math.round(basalMetabolicRate(profile) * LIFESTYLE_FACTOR[profile.lifestyle]);
}

/**
 * Objetivos diarios estimados para un perfil.
 * - Gasto total = gasto basal × (factor de la rutina diaria + lo que suma el ejercicio habitual).
 * - Adultos con sobrepeso u obesidad: déficit del 15 % / 25 %; con bajo peso: superávit del 10 %.
 *   En menores de 18 no se aplica déficit ni superávit.
 * - Nunca por debajo de 1200 kcal (1500 en hombres), salvo que el gasto estimado sea menor.
 * Es una estimación orientativa, no reemplaza el consejo de un profesional de la salud.
 */
export function dailyTargets(profile: ProfileStats): DailyTargets {
  const { weight, height, age, sex, activityLevel, lifestyle } = profile;
  const bmr = basalMetabolicRate(profile);
  const tdee = bmr * (LIFESTYLE_FACTOR[lifestyle] + ACTIVITY_INCREMENT[activityLevel]);

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
  const extraWater = ACTIVITY_WATER_ML[activityLevel] + (LIFESTYLE_WATER_ML[lifestyle] ?? 0);
  const waterMl = Math.min(4500, Math.max(1500, roundTo(35 * weight + extraWater, 50)));

  return {
    calories,
    waterMl,
    goal,
    bmr: Math.round(bmr),
    baselineBurn: baselineBurn(profile),
    tdee: Math.round(tdee),
    mealCalories: {
      breakfast: Math.round(calories * MEAL_SPLIT.breakfast),
      lunch: Math.round(calories * MEAL_SPLIT.lunch),
      dinner: Math.round(calories * MEAL_SPLIT.dinner),
    },
  };
}
