import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWeekStart } from "@/lib/diet";
import { buildShoppingResponse, ensureList } from "@/lib/shopping";
import { findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const KEY_PATTERN = /^\d{1,9}:(g|ml|unit|tbsp|tsp|slice|pinch)$/;

// PUT /api/profiles/:id/shopping/checks { week, key, checked }
// Marca (o desmarca) como comprado un ingrediente de la dieta. `key` viene en la respuesta.
export async function PUT(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { week, key, checked } = parsed.body;

  const errors: Record<string, string> = {};
  const weekStart = parseWeekStart(week);
  if (!weekStart) errors.week = "week debe ser una fecha YYYY-MM-DD que caiga en lunes";
  if (typeof key !== "string" || !KEY_PATTERN.test(key)) errors.key = "key inválida";
  if (typeof checked !== "boolean") errors.checked = "checked debe ser true o false";
  if (Object.keys(errors).length > 0) return validationError(errors);

  const list = await ensureList(prisma, found.profile.id, weekStart!);
  const listKey = key as string;
  if (checked) {
    await prisma.shoppingCheck.upsert({
      where: { listId_key: { listId: list.id, key: listKey } },
      create: { listId: list.id, key: listKey },
      update: {},
    });
  } else {
    await prisma.shoppingCheck.deleteMany({ where: { listId: list.id, key: listKey } });
  }
  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, weekStart!));
}
