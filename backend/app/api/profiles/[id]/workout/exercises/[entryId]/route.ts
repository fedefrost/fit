import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMeasures, recommendMeasures } from "@/lib/exercise";
import { badRequest, findProfile, notFound, parseId, readJson, validationError } from "@/lib/route-helpers";
import { buildWorkoutResponse, weekStartOf } from "@/lib/workout";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; entryId: string }> };

const MEASURE_FIELDS = ["minutes", "sets", "reps", "weightKg"] as const;

/** Ejercicio del día del perfil; null si no existe o es de otro perfil. */
async function findEntry(profileId: number, entryId: number) {
  const entry = await prisma.workoutExercise.findUnique({ where: { id: entryId }, include: { day: true, exercise: true } });
  return entry && entry.day.profileId === profileId ? entry : null;
}

// PATCH /api/profiles/:id/workout/exercises/:entryId
//   { done?, exerciseId?, minutes?, sets?, reps?, weightKg? }
// - done: tick de "lo hice".
// - exerciseId: cambiar el ejercicio (si no se envían medidas, se usan las recomendadas).
// - medidas: corregir lo que realmente se hizo. Se validan contra el tipo del ejercicio.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, entryId: rawEntryId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;
  const { profile } = found;

  const entryId = parseId(rawEntryId);
  if (entryId === null) return badRequest("entryId inválido");

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { body } = parsed;

  const entry = await findEntry(profile.id, entryId);
  if (!entry) return notFound("Ejercicio no encontrado");

  const data: Record<string, unknown> = {};
  if (body.done !== undefined) {
    if (typeof body.done !== "boolean") return validationError({ done: "done debe ser true o false" });
    data.done = body.done;
  }

  let exercise = entry.exercise;
  if (body.exerciseId !== undefined) {
    const next =
      typeof body.exerciseId === "number" && Number.isInteger(body.exerciseId)
        ? await prisma.exercise.findUnique({ where: { id: body.exerciseId } })
        : null;
    if (!next) return validationError({ exerciseId: "El ejercicio no existe" });
    exercise = next;
    data.exerciseId = next.id;
  }

  const sentMeasures = MEASURE_FIELDS.some((field) => body[field] !== undefined);
  if (sentMeasures) {
    // Las medidas que no se envían se completan con las actuales (si el ejercicio no cambió).
    const merged = data.exerciseId ? body : { ...pick(entry), ...body };
    const measures = parseMeasures(merged, exercise.measure);
    if (!measures.ok) return validationError(measures.errors);
    Object.assign(data, measures.measures);
  } else if (data.exerciseId) {
    Object.assign(data, recommendMeasures(exercise, profile));
  }

  if (Object.keys(data).length === 0) {
    return validationError({ body: "Envía al menos uno de: done, exerciseId, minutes, sets, reps, weightKg" });
  }

  await prisma.workoutExercise.update({ where: { id: entry.id }, data });
  return NextResponse.json(await buildWorkoutResponse(prisma, profile, weekStartOf(entry.day.date)));
}

// DELETE /api/profiles/:id/workout/exercises/:entryId -> quita un ejercicio del día.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, entryId: rawEntryId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const entryId = parseId(rawEntryId);
  if (entryId === null) return badRequest("entryId inválido");

  const entry = await findEntry(found.profile.id, entryId);
  if (!entry) return notFound("Ejercicio no encontrado");

  await prisma.workoutExercise.delete({ where: { id: entry.id } });
  return NextResponse.json(await buildWorkoutResponse(prisma, found.profile, weekStartOf(entry.day.date)));
}

function pick(entry: { minutes: number | null; sets: number | null; reps: number | null; weightKg: number | null }) {
  return Object.fromEntries(MEASURE_FIELDS.map((field) => [field, entry[field] ?? undefined]));
}
