import { NextResponse } from "next/server";
import type { Profile } from "@prisma/client";
import { isInWeek, parseIsoDate, parseWeekStart } from "@/lib/diet";
import { prisma } from "@/lib/prisma";

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const badRequest = (error: string) => NextResponse.json({ error }, { status: 400 });
export const validationError = (errors: Record<string, string>) => NextResponse.json({ errors }, { status: 400 });
export const notFound = (error = "Profile no encontrado") => NextResponse.json({ error }, { status: 404 });

/** Lee el JSON del cuerpo; si es inválido devuelve una respuesta 400 en lugar de lanzar. */
export async function readJson(request: Request): Promise<{ body: Record<string, unknown> } | { response: NextResponse }> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { response: badRequest("El cuerpo debe ser un objeto JSON") };
    }
    return { body };
  } catch {
    return { response: badRequest("JSON inválido") };
  }
}

/**
 * Fecha de la URL + semana del cuerpo ({ week }) para las rutas de un día de la semana.
 * La fecha debe ser YYYY-MM-DD dentro de esa semana (que empieza en lunes).
 */
export function parseDayInWeek(rawDate: string, week: unknown) {
  const weekStart = parseWeekStart(week);
  const date = parseIsoDate(rawDate);
  const errors: Record<string, string> = {};
  if (!weekStart) errors.week = "week debe ser una fecha YYYY-MM-DD que caiga en lunes";
  if (!date || (weekStart && !isInWeek(date, weekStart))) errors.date = "La fecha debe ser YYYY-MM-DD dentro de la semana";
  return Object.keys(errors).length > 0
    ? { response: validationError(errors) }
    : { weekStart: weekStart!, date: date! };
}

/** Perfil por el id de la URL, o la respuesta de error (400 / 404) para devolver directamente. */
export async function findProfile(rawId: string): Promise<{ profile: Profile } | { response: NextResponse }> {
  const id = parseId(rawId);
  if (id === null) return { response: badRequest("id inválido") };
  const profile = await prisma.profile.findUnique({ where: { id } });
  return profile ? { profile } : { response: notFound() };
}
