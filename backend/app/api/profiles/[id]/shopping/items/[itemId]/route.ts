import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildShoppingResponse, MAX_ITEM_TEXT, parseOptionalText } from "@/lib/shopping";
import { badRequest, findProfile, notFound, parseId, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

/** Artículo de la lista del perfil; null si no existe o es de otro perfil. */
async function findItem(profileId: number, itemId: number) {
  const item = await prisma.shoppingItem.findUnique({ where: { id: itemId }, include: { list: true } });
  return item && item.list.profileId === profileId ? item : null;
}

// PATCH /api/profiles/:id/shopping/items/:itemId { checked?, amount? }
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, itemId: rawItemId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;
  const itemId = parseId(rawItemId);
  if (itemId === null) return badRequest("itemId inválido");

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { checked, amount: rawAmount } = parsed.body;

  const errors: Record<string, string> = {};
  const data: { checked?: boolean; amount?: string | null } = {};
  if (checked !== undefined) {
    if (typeof checked !== "boolean") errors.checked = "checked debe ser true o false";
    else data.checked = checked;
  }
  const amount = parseOptionalText(rawAmount);
  if (amount === false) errors.amount = `amount debe ser texto de hasta ${MAX_ITEM_TEXT} caracteres`;
  else if (amount !== undefined) data.amount = amount;
  if (Object.keys(data).length === 0 && Object.keys(errors).length === 0) errors.body = "Envía checked o amount";
  if (Object.keys(errors).length > 0) return validationError(errors);

  const item = await findItem(found.profile.id, itemId);
  if (!item) return notFound("Artículo no encontrado");

  await prisma.shoppingItem.update({ where: { id: item.id }, data });
  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, item.list.weekStart));
}

// DELETE /api/profiles/:id/shopping/items/:itemId
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, itemId: rawItemId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;
  const itemId = parseId(rawItemId);
  if (itemId === null) return badRequest("itemId inválido");

  const item = await findItem(found.profile.id, itemId);
  if (!item) return notFound("Artículo no encontrado");

  await prisma.shoppingItem.delete({ where: { id: item.id } });
  return NextResponse.json(await buildShoppingResponse(prisma, found.profile, item.list.weekStart));
}
