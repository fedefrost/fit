import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDietResponse, parseServings, SERVINGS_RANGE } from "@/lib/diet";
import { badRequest, findProfile, notFound, parseId, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; mealId: string }> };

/** Comida de la dieta del perfil; null si no existe o es de otro perfil. */
async function findMeal(profileId: number, mealId: number) {
  const meal = await prisma.dietMeal.findUnique({ where: { id: mealId }, include: { plan: true } });
  return meal && meal.plan.profileId === profileId ? meal : null;
}

// PATCH /api/profiles/:id/diet/meals/:mealId { consumed?, recipeId?, servings? }
// - consumed: tick de "lo consumí".
// - recipeId (+ servings): cambiar la receta, p. ej. porque se comió otra cosa.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id, mealId: rawMealId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const mealId = parseId(rawMealId);
  if (mealId === null) return badRequest("mealId inválido");

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { consumed, recipeId, servings: rawServings } = parsed.body;

  const errors: Record<string, string> = {};
  const data: { consumed?: boolean; recipeId?: number; servings?: number } = {};

  if (consumed !== undefined) {
    if (typeof consumed !== "boolean") errors.consumed = "consumed debe ser true o false";
    else data.consumed = consumed;
  }
  if (recipeId !== undefined) {
    if (typeof recipeId !== "number" || !Number.isInteger(recipeId) || recipeId <= 0) errors.recipeId = "recipeId inválido";
    else data.recipeId = recipeId;
  }
  if (rawServings !== undefined) {
    const servings = parseServings(rawServings);
    if (servings === null) {
      errors.servings = `servings debe estar entre ${SERVINGS_RANGE.min} y ${SERVINGS_RANGE.max}`;
    } else data.servings = servings;
  }
  if (Object.keys(data).length === 0 && Object.keys(errors).length === 0) {
    errors.body = "Envía al menos uno de: consumed, recipeId, servings";
  }
  if (Object.keys(errors).length > 0) return validationError(errors);

  const meal = await findMeal(found.profile.id, mealId);
  if (!meal) return notFound("Comida no encontrada");

  if (data.recipeId !== undefined && !(await prisma.recipe.count({ where: { id: data.recipeId } }))) {
    return validationError({ recipeId: "La receta no existe" });
  }

  await prisma.dietMeal.update({ where: { id: meal.id }, data });
  return NextResponse.json(await buildDietResponse(prisma, found.profile, meal.plan.weekStart));
}

// DELETE /api/profiles/:id/diet/meals/:mealId -> solo comidas agregadas a mano ("extra").
// Desayuno, almuerzo y cena no se borran: se cambian o se regenera el día.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, mealId: rawMealId } = await params;
  const found = await findProfile(id);
  if ("response" in found) return found.response;

  const mealId = parseId(rawMealId);
  if (mealId === null) return badRequest("mealId inválido");

  const meal = await findMeal(found.profile.id, mealId);
  if (!meal) return notFound("Comida no encontrada");
  if (meal.slot !== "extra") {
    return validationError({ slot: "Solo se pueden quitar las comidas agregadas; las del plan se cambian o se regeneran" });
  }

  await prisma.dietMeal.delete({ where: { id: meal.id } });
  return NextResponse.json(await buildDietResponse(prisma, found.profile, meal.plan.weekStart));
}
