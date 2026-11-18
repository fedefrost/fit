import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findProfile, parseDayInWeek, readJson, validationError } from "@/lib/route-helpers";
import { buildWorkoutResponse, dropOtherWeeks, parseLocation } from "@/lib/workout";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; date: string }> };

// PUT /api/profiles/:id/workout/days/:date { week, location: "home" | "gym" }
// Registra (o cambia) dónde se entrena ese día. Es el primer paso antes de generar o añadir.
export async function PUT(request: Request, { params }: RouteContext) {
  const { id, date: rawDate } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;

  const day = parseDayInWeek(rawDate, parsed.body.week);
  if ("response" in day) return day.response;

  const location = parseLocation(parsed.body.location);
  if (!location) return validationError({ location: "location debe ser home o gym" });

  const profileId = found.profile.id;
  await dropOtherWeeks(prisma, profileId, day.weekStart);
  await prisma.workoutDay.upsert({
    where: { profileId_date: { profileId, date: day.date } },
    create: { profileId, date: day.date, location },
    update: { location },
  });

  return NextResponse.json(await buildWorkoutResponse(prisma, found.profile, day.weekStart));
}
