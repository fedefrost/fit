import { NextResponse } from "next/server";
import type { Profile } from "@prisma/client";
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

/** Perfil por el id de la URL, o la respuesta de error (400 / 404) para devolver directamente. */
export async function findProfile(rawId: string): Promise<{ profile: Profile } | { response: NextResponse }> {
  const id = parseId(rawId);
  if (id === null) return { response: badRequest("id inválido") };
  const profile = await prisma.profile.findUnique({ where: { id } });
  return profile ? { profile } : { response: notFound() };
}
