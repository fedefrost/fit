import type { EquipmentLocation, Muscle, PrismaClient, Profile } from "@prisma/client";
import { isoDate, weekDates } from "./diet";
import { caloriesBurned, fitnessProfile, kcalPerMinute, recommendMeasures, type Measures } from "./exercise";
import { baselineBurn } from "./nutrition";

/** Músculos que se pueden elegir al generar ("general" es el calentamiento, no se elige). */
export const TRAINABLE_MUSCLES = ["legs", "biceps", "triceps", "glutes", "chest", "back", "abs", "shoulders"] as const;
export const MAX_MUSCLES = 2;
export const MAX_ENTRIES_PER_DAY = 30;
export const LOCATIONS = ["home", "gym"] as const;

export function parseLocation(raw: unknown): EquipmentLocation | null {
  return typeof raw === "string" && (LOCATIONS as readonly string[]).includes(raw) ? (raw as EquipmentLocation) : null;
}

export function parseMuscles(raw: unknown): Muscle[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MUSCLES) return null;
  const unique = [...new Set(raw)];
  if (unique.length !== raw.length) return null;
  return unique.every((m) => (TRAINABLE_MUSCLES as readonly unknown[]).includes(m)) ? (unique as Muscle[]) : null;
}

/** Lunes de la semana de una fecha (fechas a medianoche UTC, como las guarda Prisma). */
export function weekStartOf(date: Date) {
  const day = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - day * 86_400_000);
}

/** Sin historial: borra los días de entrenamiento de otras semanas. */
export async function dropOtherWeeks(prisma: PrismaClient, profileId: number, weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  await prisma.workoutDay.deleteMany({
    where: { profileId, OR: [{ date: { lt: weekStart } }, { date: { gte: weekEnd } }] },
  });
}

async function equipmentByLocation(prisma: PrismaClient, profileId: number) {
  const rows = await prisma.profileEquipment.findMany({ where: { profileId }, select: { equipmentId: true, location: true } });
  return {
    home: rows.filter((row) => row.location === "home").map((row) => row.equipmentId),
    gym: rows.filter((row) => row.location === "gym").map((row) => row.equipmentId),
  };
}

const exerciseSelect = {
  id: true,
  muscle: true,
  measure: true,
  met: true,
  baseMinutes: true,
  baseReps: true,
  secondsPerRep: true,
  loadFactor: true,
  highImpact: true,
  equipment: { select: { equipmentId: true } },
} as const;

/**
 * Semana de entrenamiento:
 * { weekStart, fitness, equipment: { home, gym }, personalized: [{ exerciseId, recommended, kcalPerMinute }],
 *   days: [{ date, location | null, muscles, entries: [...con calorías] }] }
 * `personalized` permite al frontend proponer medidas y estimar calorías antes de guardar.
 */
export async function buildWorkoutResponse(prisma: PrismaClient, profile: Profile, weekStart: Date) {
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const [exercises, equipment, days] = await Promise.all([
    prisma.exercise.findMany({ select: exerciseSelect }),
    equipmentByLocation(prisma, profile.id),
    prisma.workoutDay.findMany({
      where: { profileId: profile.id, date: { gte: weekStart, lt: weekEnd } },
      include: { entries: { orderBy: { id: "asc" } } },
    }),
  ]);
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  return {
    weekStart: isoDate(weekStart),
    fitness: fitnessProfile(profile),
    baselineBurn: baselineBurn(profile), // gasto de un día normal sin ejercicio (rutina diaria)
    equipment,
    personalized: exercises.map((exercise) => ({
      exerciseId: exercise.id,
      recommended: recommendMeasures(exercise, profile),
      kcalPerMinute: Math.round(kcalPerMinute(exercise, profile) * 100) / 100,
    })),
    days: weekDates(weekStart).map((date) => {
      const day = days.find((item) => isoDate(item.date) === isoDate(date));
      return {
        date: isoDate(date),
        location: day?.location ?? null,
        muscles: day?.muscles ?? [],
        entries: (day?.entries ?? []).map((entry) => ({
          id: entry.id,
          exerciseId: entry.exerciseId,
          source: entry.source,
          minutes: entry.minutes,
          sets: entry.sets,
          reps: entry.reps,
          weightKg: entry.weightKg,
          done: entry.done,
          calories: caloriesBurned(byId.get(entry.exerciseId)!, entry, profile),
        })),
      };
    }),
  };
}

/**
 * Genera la rutina de un día para 1 o 2 músculos (reemplaza los ejercicios generados y
 * conserva los añadidos a mano):
 * - Solo ejercicios cuyo equipamiento esté disponible en el lugar del día (los de peso
 *   corporal siempre valen) y, si el perfil tiene restricción, sin alto impacto.
 * - 1 ejercicio general de calentamiento + 4 del músculo (o 3 de cada uno si son 2).
 * - Evita repetir ejercicios de otros días de la semana y los que se están reemplazando.
 * - Medidas ajustadas al perfil (recommendMeasures).
 */
export async function generateWorkoutDay(
  prisma: PrismaClient,
  profile: Profile,
  dayId: number,
  location: EquipmentLocation,
  muscles: Muscle[],
  random: () => number = Math.random,
) {
  const [exercises, equipment] = await Promise.all([
    prisma.exercise.findMany({ select: exerciseSelect }),
    equipmentByLocation(prisma, profile.id),
  ]);
  const available = new Set(equipment[location]);
  const { restrictHighImpact } = fitnessProfile(profile);
  const usable = exercises.filter(
    (exercise) =>
      exercise.equipment.every(({ equipmentId }) => available.has(equipmentId)) &&
      !(restrictHighImpact && exercise.highImpact),
  );

  await prisma.$transaction(async (tx) => {
    const day = await tx.workoutDay.findUniqueOrThrow({ where: { id: dayId } });
    const replaced = await tx.workoutExercise.findMany({ where: { dayId, source: "planned" }, select: { exerciseId: true } });
    const others = await tx.workoutExercise.findMany({
      where: { day: { profileId: profile.id, id: { not: dayId } }, source: "planned" },
      select: { exerciseId: true },
    });
    const avoid = new Set(replaced.map((entry) => entry.exerciseId));
    const usage = new Map<number, number>();
    for (const { exerciseId } of others) usage.set(exerciseId, (usage.get(exerciseId) ?? 0) + 1);

    const pick = (muscle: Muscle, count: number) =>
      usable
        .filter((exercise) => exercise.muscle === muscle)
        .map((exercise) => ({
          exercise,
          score: random() * 2 - (usage.get(exercise.id) ?? 0) * 1.5 - (avoid.has(exercise.id) ? 2 : 0),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(({ exercise }) => exercise);

    const perMuscle = muscles.length === 1 ? 4 : 3;
    const chosen = [...pick("general", 1), ...muscles.flatMap((muscle) => pick(muscle, perMuscle))];

    await tx.workoutExercise.deleteMany({ where: { dayId, source: "planned" } });
    for (const exercise of chosen) {
      // De a uno para conservar el orden (calentamiento primero) por id.
      await tx.workoutExercise.create({
        data: { dayId, exerciseId: exercise.id, source: "planned", ...recommendMeasures(exercise, profile) },
      });
    }
    await tx.workoutDay.update({ where: { id: day.id }, data: { muscles } });
  });
}

export type { Measures };
