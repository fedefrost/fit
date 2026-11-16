import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProfileInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function notFound() {
  return NextResponse.json({ error: "Profile no encontrado" }, { status: 404 });
}

function isNotFoundError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
  );
}

// GET /api/profiles/:id -> obtener uno
export async function GET(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const profile = await prisma.profile.findUnique({ where: { id } });
  if (!profile) return notFound();

  return NextResponse.json(profile);
}

// PUT /api/profiles/:id -> actualizar
export async function PUT(request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "id inválido" }, { status: 400 });

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

  try {
    const profile = await prisma.profile.update({ where: { id }, data: result.data });
    return NextResponse.json(profile);
  } catch (error) {
    if (isNotFoundError(error)) return notFound();
    throw error;
  }
}

// DELETE /api/profiles/:id -> eliminar
export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  try {
    await prisma.profile.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isNotFoundError(error)) return notFound();
    throw error;
  }
}
