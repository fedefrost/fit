import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProfileFoods, parseFoodPreferencesInput } from "@/lib/foods";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const notFound = () => NextResponse.json({ error: "Profile no encontrado" }, { status: 404 });

async function profileExists(id: number) {
  return (await prisma.profile.count({ where: { id } })) > 0;
}

// GET /api/profiles/:id/foods -> { preferred: Food[], rejected: Food[] }
export async function GET(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  if (!(await profileExists(id))) return notFound();

  return NextResponse.json(await getProfileFoods(prisma, id));
}

// PUT /api/profiles/:id/foods { preferred: number[], rejected: number[] }
// Reemplaza ambas listas completas (lo que no se envía se quita).
export async function PUT(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const result = parseFoodPreferencesInput(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 400 });

  const { preferred, rejected } = result.data;
  const allIds = [...preferred, ...rejected];

  if (!(await profileExists(id))) return notFound();

  const known = await prisma.food.count({ where: { id: { in: allIds } } });
  if (known !== allIds.length) {
    return NextResponse.json({ errors: { foods: "Hay ids que no existen en el catálogo" } }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.profileFood.deleteMany({ where: { profileId: id } }),
    prisma.profileFood.createMany({
      data: [
        ...preferred.map((foodId) => ({ profileId: id, foodId, preference: "preferred" as const })),
        ...rejected.map((foodId) => ({ profileId: id, foodId, preference: "rejected" as const })),
      ],
    }),
  ]);

  return NextResponse.json(await getProfileFoods(prisma, id));
}
