import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/equipment -> catálogo de máquinas y herramientas (solo lectura).
export async function GET() {
  const equipment = await prisma.equipment.findMany({
    orderBy: { nameEs: "asc" },
    select: { id: true, slug: true, nameEs: true, nameEn: true },
  });
  return NextResponse.json(equipment);
}
