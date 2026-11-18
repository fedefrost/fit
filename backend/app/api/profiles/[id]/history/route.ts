import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildHistoryResponse, parseMonth } from "@/lib/history";
import { badRequest, findProfile } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/profiles/:id/history?month=YYYY-MM
// -> { month, days: [{ date, targets, consumed, plannedCalories, meals, workout, baselineBurn }] }
// Solo incluye los días con dieta o entrenamiento.
export async function GET(request: NextRequest, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const month = parseMonth(request.nextUrl.searchParams.get("month"));
  if (!month) return badRequest("month debe ser YYYY-MM");

  return NextResponse.json(await buildHistoryResponse(prisma, found.profile, month));
}
