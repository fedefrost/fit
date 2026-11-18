import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWeekStart } from "@/lib/diet";
import { buildShoppingResponse, ensureList, parseDays, parsePeople, PEOPLE_RANGE } from "@/lib/shopping";
import { badRequest, findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/profiles/:id/shopping?week=YYYY-MM-DD (lunes)
// -> { weekStart, people, days, hasDiet, ingredients: [...], items: [...] }
export async function GET(request: NextRequest, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const weekStart = parseWeekStart(request.nextUrl.searchParams.get("week"));
  if (!weekStart) return badRequest("week debe ser una fecha YYYY-MM-DD que caiga en lunes");

  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, weekStart));
}

// PUT /api/profiles/:id/shopping { week, people?, days?, uncheckAll? }
// - people: personas (multiplica las cantidades).
// - days: días incluidos (0 = lunes ... 6 = domingo); [] = toda la semana.
// - uncheckAll: desmarca todo lo comprado (ingredientes y agregados).
export async function PUT(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { week, people: rawPeople, days: rawDays, uncheckAll } = parsed.body;

  const errors: Record<string, string> = {};
  const weekStart = parseWeekStart(week);
  if (!weekStart) errors.week = "week debe ser una fecha YYYY-MM-DD que caiga en lunes";
  const data: { people?: number; days?: number[] } = {};
  if (rawPeople !== undefined) {
    const people = parsePeople(rawPeople);
    if (people === null) errors.people = `people debe ser un entero entre ${PEOPLE_RANGE.min} y ${PEOPLE_RANGE.max}`;
    else data.people = people;
  }
  if (rawDays !== undefined) {
    const days = parseDays(rawDays);
    if (days === null) errors.days = "days debe ser una lista de enteros entre 0 (lunes) y 6 (domingo)";
    else data.days = days;
  }
  if (uncheckAll !== undefined && typeof uncheckAll !== "boolean") errors.uncheckAll = "uncheckAll debe ser true o false";
  if (Object.keys(errors).length > 0) return validationError(errors);

  const list = await ensureList(prisma, found.profile.id, weekStart!);
  await prisma.$transaction([
    prisma.shoppingList.update({ where: { id: list.id }, data }),
    ...(uncheckAll
      ? [
          prisma.shoppingCheck.deleteMany({ where: { listId: list.id } }),
          prisma.shoppingItem.updateMany({ where: { listId: list.id }, data: { checked: false } }),
        ]
      : []),
  ]);
  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, weekStart!));
}
