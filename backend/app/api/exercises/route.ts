import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/exercises -> catálogo de ejercicios con el equipamiento que requiere cada uno.
// La animación de cada ejercicio está en el frontend: /exercises/<slug>.png y .gif.
export async function GET() {
  const exercises = await prisma.exercise.findMany({
    orderBy: [{ muscle: "asc" }, { nameEs: "asc" }],
    select: {
      id: true,
      slug: true,
      nameEs: true,
      nameEn: true,
      instructionsEs: true,
      instructionsEn: true,
      muscle: true,
      measure: true,
      met: true,
      secondsPerRep: true,
      highImpact: true,
      equipment: { select: { equipmentId: true } },
    },
  });
  return NextResponse.json(
    exercises.map(({ equipment, ...exercise }) => ({
      ...exercise,
      equipmentIds: equipment.map((item) => item.equipmentId),
    })),
  );
}
