import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDietResponse, parseWeekStart } from "@/lib/diet";
import { badRequest, findProfile } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/profiles/:id/diet?week=YYYY-MM-DD (lunes)
// -> { weekStart, targets, plan: null | { updatedAt, days: [{ date, meals: [...] }] } }
export async function GET(request: NextRequest, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const weekStart = parseWeekStart(request.nextUrl.searchParams.get("week"));
  if (!weekStart) return badRequest("week debe ser una fecha YYYY-MM-DD que caiga en lunes");

  return NextResponse.json(await buildDietResponse(prisma, found.profile, weekStart));
}
