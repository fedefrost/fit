import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDietResponse, generateDiet, isInWeek, parseIsoDate, parseWeekStart } from "@/lib/diet";
import { findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/profiles/:id/diet/generate { week: "YYYY-MM-DD", date?: "YYYY-MM-DD" }
// Sin `date` genera toda la semana; con `date` solo ese día. Devuelve la dieta completa.
export async function POST(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;

  const weekStart = parseWeekStart(parsed.body.week);
  if (!weekStart) return validationError({ week: "week debe ser una fecha YYYY-MM-DD que caiga en lunes" });

  let date: Date | undefined;
  if (parsed.body.date !== undefined) {
    const parsedDate = parseIsoDate(parsed.body.date);
    if (!parsedDate || !isInWeek(parsedDate, weekStart)) {
      return validationError({ date: "date debe ser una fecha YYYY-MM-DD dentro de la semana" });
    }
    date = parsedDate;
  }

  await generateDiet(prisma, found.profile, weekStart, date);
  return NextResponse.json(await buildDietResponse(prisma, found.profile, weekStart));
}
