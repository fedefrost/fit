import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWeekStart } from "@/lib/diet";
import { badRequest, findProfile } from "@/lib/route-helpers";
import { buildWorkoutResponse } from "@/lib/workout";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/profiles/:id/workout?week=YYYY-MM-DD (lunes)
export async function GET(request: NextRequest, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const weekStart = parseWeekStart(request.nextUrl.searchParams.get("week"));
  if (!weekStart) return badRequest("week debe ser una fecha YYYY-MM-DD que caiga en lunes");

  return NextResponse.json(await buildWorkoutResponse(prisma, found.profile, weekStart));
}
