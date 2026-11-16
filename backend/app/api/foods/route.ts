import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { foodSelect } from "@/lib/foods";

export const dynamic = "force-dynamic";

// GET /api/foods -> catálogo completo de ingredientes (solo lectura, ~300 filas).
// El frontend lo descarga una vez y filtra en el navegador.
export async function GET() {
  const foods = await prisma.food.findMany({
    select: foodSelect,
    orderBy: [{ category: "asc" }, { nameEs: "asc" }],
  });
  return NextResponse.json(foods);
}
