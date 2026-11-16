import type { Food, PrismaClient } from "@prisma/client";

/** Máximo de alimentos por lista y por perfil (200 preferidos y 200 rechazados). */
export const MAX_FOODS_PER_LIST = 200;

export type FoodPreferencesInput = { preferred: number[]; rejected: number[] };

type ParseResult =
  | { ok: true; data: FoodPreferencesInput }
  | { ok: false; errors: Record<string, string> };

function parseIdList(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((id) => Number.isInteger(id) && id > 0)) return null;
  return [...new Set(value as number[])];
}

/** Valida { preferred: number[], rejected: number[] } (ids de alimentos del catálogo). */
export function parseFoodPreferencesInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: { body: "El cuerpo debe ser un objeto JSON" } };
  }

  const raw = body as Record<string, unknown>;
  const preferred = parseIdList(raw.preferred ?? []);
  const rejected = parseIdList(raw.rejected ?? []);
  const errors: Record<string, string> = {};

  if (!preferred) errors.preferred = "preferred debe ser una lista de ids de alimentos";
  else if (preferred.length > MAX_FOODS_PER_LIST) {
    errors.preferred = `Se permiten como máximo ${MAX_FOODS_PER_LIST} alimentos preferidos`;
  }

  if (!rejected) errors.rejected = "rejected debe ser una lista de ids de alimentos";
  else if (rejected.length > MAX_FOODS_PER_LIST) {
    errors.rejected = `Se permiten como máximo ${MAX_FOODS_PER_LIST} alimentos rechazados`;
  }

  if (preferred && rejected) {
    const overlap = preferred.filter((id) => rejected.includes(id));
    if (overlap.length > 0) {
      errors.overlap = `Un alimento no puede estar en ambas listas (ids: ${overlap.join(", ")})`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { preferred: preferred!, rejected: rejected! } };
}

export const foodSelect = { id: true, slug: true, category: true, nameEs: true, nameEn: true } as const;

export type FoodDto = Pick<Food, keyof typeof foodSelect>;

/** Listas de un perfil, ordenadas por nombre en español. */
export async function getProfileFoods(prisma: PrismaClient, profileId: number) {
  const rows = await prisma.profileFood.findMany({
    where: { profileId },
    select: { preference: true, food: { select: foodSelect } },
    orderBy: { food: { nameEs: "asc" } },
  });

  return {
    preferred: rows.filter((row) => row.preference === "preferred").map((row) => row.food),
    rejected: rows.filter((row) => row.preference === "rejected").map((row) => row.food),
  };
}
