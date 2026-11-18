import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseWeekStart } from "@/lib/diet";
import { buildShoppingResponse, ensureList, MAX_ITEM_TEXT, MAX_SHOPPING_ITEMS, parseOptionalText } from "@/lib/shopping";
import { findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/profiles/:id/shopping/items { week, foodId? | name?, amount? }
// Agrega un artículo a mano: un alimento del catálogo (foodId) o texto libre (name).
export async function POST(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { week, foodId, name: rawName, amount: rawAmount } = parsed.body;

  const errors: Record<string, string> = {};
  const weekStart = parseWeekStart(week);
  if (!weekStart) errors.week = "week debe ser una fecha YYYY-MM-DD que caiga en lunes";
  const name = parseOptionalText(rawName);
  const amount = parseOptionalText(rawAmount);
  if (name === false) errors.name = `name debe ser texto de hasta ${MAX_ITEM_TEXT} caracteres`;
  if (amount === false) errors.amount = `amount debe ser texto de hasta ${MAX_ITEM_TEXT} caracteres`;
  const hasFood = foodId !== undefined && foodId !== null;
  if (hasFood && (typeof foodId !== "number" || !Number.isInteger(foodId) || foodId <= 0)) errors.foodId = "foodId inválido";
  if (!hasFood && !name && !errors.name) errors.name = "Envía foodId o name";
  if (Object.keys(errors).length > 0) return validationError(errors);

  if (hasFood && !(await prisma.food.count({ where: { id: foodId as number } }))) {
    return validationError({ foodId: "El alimento no existe" });
  }

  const list = await ensureList(prisma, found.profile.id, weekStart!);
  if ((await prisma.shoppingItem.count({ where: { listId: list.id } })) >= MAX_SHOPPING_ITEMS) {
    return validationError({ items: `La lista admite hasta ${MAX_SHOPPING_ITEMS} artículos agregados` });
  }
  await prisma.shoppingItem.create({
    data: {
      listId: list.id,
      foodId: hasFood ? (foodId as number) : null,
      name: hasFood ? null : (name as string),
      amount: amount || null,
    },
  });
  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, weekStart!), { status: 201 });
}
