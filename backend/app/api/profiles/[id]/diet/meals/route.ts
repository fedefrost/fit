import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildDietResponse,
  isInWeek,
  isoDate,
  MAX_EXTRAS_PER_DAY,
  parseIsoDate,
  parseServings,
  parseWeekStart,
  SERVINGS_RANGE,
} from "@/lib/diet";
import { findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/profiles/:id/diet/meals { week, date, recipeId, servings }
// Agrega una comida consumida fuera del plan (colación, aperitivo...). Queda marcada como consumida.
export async function POST(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;
  const { profile } = found;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;
  const { week, date: rawDate, recipeId, servings: rawServings } = parsed.body;

  const errors: Record<string, string> = {};
  const weekStart = parseWeekStart(week);
  const date = parseIsoDate(rawDate);
  const servings = parseServings(rawServings);
  if (!weekStart) errors.week = "week debe ser una fecha YYYY-MM-DD que caiga en lunes";
  if (!date || (weekStart && !isInWeek(date, weekStart))) errors.date = "date debe ser una fecha YYYY-MM-DD dentro de la semana";
  if (typeof recipeId !== "number" || !Number.isInteger(recipeId) || recipeId <= 0) errors.recipeId = "recipeId inválido";
  if (servings === null) {
    errors.servings = `servings debe estar entre ${SERVINGS_RANGE.min} y ${SERVINGS_RANGE.max}`;
  }
  if (Object.keys(errors).length > 0) return validationError(errors);

  const plan = await prisma.dietPlan.findUnique({ where: { profileId: profile.id } });
  if (!plan || isoDate(plan.weekStart) !== isoDate(weekStart!)) {
    return NextResponse.json({ error: "Primero hay que generar la dieta de esta semana" }, { status: 409 });
  }

  if (!(await prisma.recipe.count({ where: { id: recipeId as number } }))) {
    return validationError({ recipeId: "La receta no existe" });
  }

  const extras = await prisma.dietMeal.count({ where: { planId: plan.id, date: date!, slot: "extra" } });
  if (extras >= MAX_EXTRAS_PER_DAY) {
    return validationError({ date: `Se permiten como máximo ${MAX_EXTRAS_PER_DAY} comidas agregadas por día` });
  }

  await prisma.dietMeal.create({
    data: { planId: plan.id, date: date!, slot: "extra", recipeId: recipeId as number, servings: servings!, consumed: true },
  });

  return NextResponse.json(await buildDietResponse(prisma, profile, weekStart!), { status: 201 });
}
