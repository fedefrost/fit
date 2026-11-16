import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_PROFILES, parseProfileInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/profiles -> listar, con cuántos alimentos preferidos y rechazados tiene cada uno
export async function GET() {
  const [profiles, counts] = await Promise.all([
    prisma.profile.findMany({ orderBy: { id: "asc" } }),
    prisma.profileFood.groupBy({ by: ["profileId", "preference"], _count: { _all: true } }),
  ]);

  const countFor = (profileId: number, preference: "preferred" | "rejected") =>
    counts.find((row) => row.profileId === profileId && row.preference === preference)?._count._all ?? 0;

  return NextResponse.json(
    profiles.map((profile) => ({
      ...profile,
      foodCounts: { preferred: countFor(profile.id, "preferred"), rejected: countFor(profile.id, "rejected") },
    })),
  );
}

// POST /api/profiles -> crear
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = parseProfileInput(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const { data } = result;

  // Contar y crear dentro de la misma transacción, con un candado que dura hasta el commit:
  // así dos altas simultáneas no pueden pasar ambas el control y superar el máximo.
  // 727001 es una clave arbitraria que identifica este candado.
  const profile = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727001)`;
    const count = await tx.profile.count();
    if (count >= MAX_PROFILES) return null;
    return tx.profile.create({ data });
  });

  if (!profile) {
    return NextResponse.json(
      { error: `Se alcanzó el máximo de ${MAX_PROFILES} perfiles. Elimina uno para agregar otro.` },
      { status: 409 },
    );
  }

  return NextResponse.json({ ...profile, foodCounts: { preferred: 0, rejected: 0 } }, { status: 201 });
}
