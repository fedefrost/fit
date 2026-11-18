import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseMeasures } from "@/lib/exercise";
import { findProfile, parseDayInWeek, readJson, validationError } from "@/lib/route-helpers";
import { buildWorkoutResponse, MAX_ENTRIES_PER_DAY } from "@/lib/workout";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; date: string }> };

// POST /api/profiles/:id/workout/days/:date/exercises
//   { week, exerciseId, minutes? | sets + reps (+ weightKg) según el ejercicio }
// Añade un ejercicio realizado; queda marcado como hecho.
export async function POST(request: Request, { params }: RouteContext) {
  const { id, date: rawDate } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { body } = parsed;

  const day = parseDayInWeek(rawDate, body.week);
  if ("response" in day) return day.response;

  const exerciseId = body.exerciseId;
  if (typeof exerciseId !== "number" || !Number.isInteger(exerciseId) || exerciseId <= 0) {
    return validationError({ exerciseId: "exerciseId inválido" });
  }
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) return validationError({ exerciseId: "El ejercicio no existe" });

  const measures = parseMeasures(body, exercise.measure);
  if (!measures.ok) return validationError(measures.errors);

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { profileId_date: { profileId: found.profile.id, date: day.date } },
    include: { _count: { select: { entries: true } } },
  });
  if (!workoutDay) {
    return NextResponse.json({ error: "Primero hay que elegir si ese día se entrena en casa o en el gimnasio" }, { status: 409 });
  }
  if (workoutDay._count.entries >= MAX_ENTRIES_PER_DAY) {
    return validationError({ date: `Se permiten como máximo ${MAX_ENTRIES_PER_DAY} ejercicios por día` });
  }

  await prisma.workoutExercise.create({
    data: { dayId: workoutDay.id, exerciseId, source: "extra", done: true, ...measures.measures },
  });
  return NextResponse.json(await buildWorkoutResponse(prisma, found.profile, day.weekStart), { status: 201 });
}
