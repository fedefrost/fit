import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/recipes -> catálogo completo de recetas con sus ingredientes (solo lectura).
// `optional`: ingrediente no clave; si el perfil lo rechaza, la receta se hace sin él.
// El frontend lo descarga una vez y filtra en el navegador (por nombre, comida o ingrediente).
export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { nameEs: "asc" },
    select: {
      id: true,
      slug: true,
      nameEs: true,
      nameEn: true,
      summaryEs: true,
      summaryEn: true,
      mealTypes: true,
      calories: true,
      waterMl: true,
      ingredients: {
        orderBy: { position: "asc" },
        select: { foodId: true, quantity: true, unit: true, optional: true },
      },
    },
  });
  return NextResponse.json(recipes);
}
