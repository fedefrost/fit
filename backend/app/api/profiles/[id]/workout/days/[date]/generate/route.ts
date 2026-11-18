import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findProfile, parseDayInWeek, readJson, validationError } from "@/lib/route-helpers";
import { buildWorkoutResponse, generateWorkoutDay, MAX_MUSCLES, parseMuscles, TRAINABLE_MUSCLES } from "@/lib/workout";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; date: string }> };

// POST /api/profiles/:id/workout/days/:date/generate { week, muscles: Muscle[] (1 a 2) }
// Reemplaza los ejercicios generados del día; conserva los añadidos a mano.
export async function POST(request: Request, { params }: RouteContext) {
  const { id, date: rawDate } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;

  const day = parseDayInWeek(rawDate, parsed.body.week);
  if ("response" in day) return day.response;

  const muscles = parseMuscles(parsed.body.muscles);
  if (!muscles) {
    return validationError({
      muscles: `Elige entre 1 y ${MAX_MUSCLES} músculos distintos de: ${TRAINABLE_MUSCLES.join(", ")}`,
    });
  }

  const workoutDay = await prisma.workoutDay.findUnique({
    where: { profileId_date: { profileId: found.profile.id, date: day.date } },
  });
  if (!workoutDay) {
    return NextResponse.json({ error: "Primero hay que elegir si ese día se entrena en casa o en el gimnasio" }, { status: 409 });
  }

  await generateWorkoutDay(prisma, found.profile, workoutDay.id, workoutDay.location, muscles);
  return NextResponse.json(await buildWorkoutResponse(prisma, found.profile, day.weekStart));
}
