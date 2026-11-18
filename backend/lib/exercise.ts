import type { ActivityLevel, Exercise, Profile, Sex } from "@prisma/client";
import { basalMetabolicRate } from "./nutrition";

export type FitnessLevel = "beginner" | "intermediate" | "advanced";

export type Measures = {
  minutes: number | null;
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

type ProfileStats = Pick<Profile, "weight" | "height" | "age" | "sex" | "activityLevel">;
type ExerciseStats = Pick<
  Exercise,
  "measure" | "met" | "baseMinutes" | "baseReps" | "secondsPerRep" | "loadFactor" | "highImpact"
>;

const ACTIVITY_SCORE: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 1,
  moderate: 2,
  active: 3,
  very_active: 4,
};

/**
 * Nivel físico estimado y restricciones del perfil.
 * - Nivel: parte del nivel de actividad; resta por sobrepeso/obesidad y por edad (≥60 o <16).
 * - Con obesidad o 65+: sin ejercicios de alto impacto (saltos, carrera) y como máximo 20 min
 *   (30 min con 65+) por ejercicio de tiempo.
 */
export function fitnessProfile(profile: ProfileStats) {
  const bmi = profile.weight / (profile.height / 100) ** 2;
  let score = ACTIVITY_SCORE[profile.activityLevel];
  if (bmi >= 30) score -= 2;
  else if (bmi >= 25) score -= 1;
  if (profile.age >= 60 || profile.age < 16) score -= 1;

  const level: FitnessLevel = score <= 1 ? "beginner" : score <= 2 ? "intermediate" : "advanced";
  const obese = bmi >= 30;
  const senior = profile.age >= 65;
  return {
    level,
    restrictHighImpact: obese || senior,
    maxMinutes: obese ? 20 : senior ? 30 : 60,
  };
}

const VOLUME: Record<FitnessLevel, number> = { beginner: 0.6, intermediate: 1, advanced: 1.4 };
const REPS: Record<FitnessLevel, number> = { beginner: 0.75, intermediate: 1, advanced: 1.25 };
const SETS: Record<FitnessLevel, number> = { beginner: 2, intermediate: 3, advanced: 4 };
const LOAD: Record<FitnessLevel, number> = { beginner: 0.6, intermediate: 0.8, advanced: 1 };
const SEX_LOAD: Record<Sex, number> = { male: 1, female: 0.7, other: 0.85 };

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Medidas recomendadas de un ejercicio para el perfil (lo que propone el generador). */
export function recommendMeasures(exercise: ExerciseStats, profile: ProfileStats): Measures {
  const { level, maxMinutes } = fitnessProfile(profile);

  if (exercise.measure === "time") {
    const minutes = Math.min((exercise.baseMinutes ?? 10) * VOLUME[level], maxMinutes);
    return { minutes: Math.max(0.5, roundTo(minutes, 0.5)), sets: null, reps: null, weightKg: null };
  }

  const sets = SETS[level];
  const reps = Math.max(3, Math.round((exercise.baseReps ?? 10) * REPS[level]));
  if (exercise.measure === "reps") return { minutes: null, sets, reps, weightKg: null };

  const ageFactor = profile.age >= 60 ? 0.8 : 1;
  const raw = (exercise.loadFactor ?? 0.1) * profile.weight * LOAD[level] * SEX_LOAD[profile.sex] * ageFactor;
  const weightKg = Math.max(1, raw < 5 ? roundTo(raw, 0.5) : Math.round(raw));
  return { minutes: null, sets, reps, weightKg };
}

/** Minutos de trabajo efectivo: los de tiempo, o series × repeticiones × segundos por repetición. */
export function activeMinutes(exercise: ExerciseStats, measures: Measures) {
  if (exercise.measure === "time") return measures.minutes ?? 0;
  return ((measures.sets ?? 0) * (measures.reps ?? 0) * exercise.secondsPerRep) / 60;
}

/**
 * kcal por minuto para el perfil: MET × gasto basal del perfil por minuto.
 * Un MET es el gasto en reposo; en vez del valor genérico (3,5 ml O₂/kg/min, que sobreestima
 * a la mayoría de los adultos) se usa el gasto basal estimado con Mifflin-St Jeor, así cuentan
 * edad, peso, altura y sexo, no solo el peso.
 */
export function kcalPerMinute(exercise: Pick<Exercise, "met">, profile: ProfileStats) {
  return (exercise.met * basalMetabolicRate(profile)) / 1440;
}

/** Con carga, el esfuerzo sube hasta un 50 % cuando el peso iguala al peso corporal. */
export function loadIntensity(exercise: ExerciseStats, measures: Measures, profile: ProfileStats) {
  if (exercise.measure !== "reps_weight" || !measures.weightKg) return 1;
  return 1 + 0.5 * Math.min(1, measures.weightKg / profile.weight);
}

/** Descanso entre series que se suma en los ejercicios de series (1 min a 1,5 MET por serie). */
export const REST = { minutesPerSet: 1, met: 1.5 } as const;

export function restMinutes(exercise: ExerciseStats, measures: Measures) {
  return exercise.measure === "time" ? 0 : (measures.sets ?? 0) * REST.minutesPerSet;
}

export function caloriesBurned(exercise: ExerciseStats, measures: Measures, profile: ProfileStats) {
  const work = activeMinutes(exercise, measures) * kcalPerMinute(exercise, profile) * loadIntensity(exercise, measures, profile);
  const rest = restMinutes(exercise, measures) * kcalPerMinute({ met: REST.met }, profile);
  return Math.round(work + rest);
}

// ---------- Validación de medidas ingresadas ----------

const LIMITS = {
  minutes: { min: 0.25, max: 300 },
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 200 },
  weightKg: { min: 0.5, max: 500 },
} as const;

/**
 * Valida las medidas para el tipo de ejercicio: tiempo → minutes; reps → sets y reps;
 * reps_weight → sets, reps y weightKg. Las que no corresponden se guardan como null.
 */
export function parseMeasures(
  body: Record<string, unknown>,
  measure: Exercise["measure"],
): { ok: true; measures: Measures } | { ok: false; errors: Record<string, string> } {
  const required: (keyof Measures)[] =
    measure === "time" ? ["minutes"] : measure === "reps" ? ["sets", "reps"] : ["sets", "reps", "weightKg"];
  const errors: Record<string, string> = {};
  const measures: Measures = { minutes: null, sets: null, reps: null, weightKg: null };

  for (const field of required) {
    const value = body[field];
    const { min, max } = LIMITS[field];
    const integer = field === "sets" || field === "reps";
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
      errors[field] = `${field} debe ser ${integer ? "un entero" : "un número"} entre ${min} y ${max}`;
    } else {
      measures[field] = integer ? value : Math.round(value * 100) / 100;
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, measures };
}
