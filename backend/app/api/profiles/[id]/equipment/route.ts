import { NextResponse } from "next/server";
import type { EquipmentLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findProfile, readJson, validationError } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const select = { id: true, slug: true, nameEs: true, nameEn: true } as const;

async function listEquipment(profileId: number) {
  const rows = await prisma.profileEquipment.findMany({
    where: { profileId },
    select: { location: true, equipment: { select } },
    orderBy: { equipment: { nameEs: "asc" } },
  });
  return {
    home: rows.filter((row) => row.location === "home").map((row) => row.equipment),
    gym: rows.filter((row) => row.location === "gym").map((row) => row.equipment),
  };
}

function parseIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || !value.every((id) => Number.isInteger(id) && id > 0)) return null;
  return [...new Set(value as number[])];
}

// GET /api/profiles/:id/equipment -> { home: Equipment[], gym: Equipment[] }
export async function GET(_request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;
  return NextResponse.json(await listEquipment(found.profile.id));
}

// PUT /api/profiles/:id/equipment { home: number[], gym: number[] }
// Reemplaza ambas listas. Un mismo equipo puede estar en casa y en el gimnasio.
export async function PUT(request: Request, { params }: RouteContext) {
  const found = await findProfile((await params).id);
  if ("response" in found) return found.response;

  const parsed = await readJson(request);
  if ("response" in parsed) return parsed.response;

  const home = parseIds(parsed.body.home ?? []);
  const gym = parseIds(parsed.body.gym ?? []);
  const errors: Record<string, string> = {};
  if (!home) errors.home = "home debe ser una lista de ids de equipamiento";
  if (!gym) errors.gym = "gym debe ser una lista de ids de equipamiento";
  if (Object.keys(errors).length > 0) return validationError(errors);

  const allIds = [...new Set([...home!, ...gym!])];
  if ((await prisma.equipment.count({ where: { id: { in: allIds } } })) !== allIds.length) {
    return validationError({ equipment: "Hay ids que no existen en el catálogo" });
  }

  const profileId = found.profile.id;
  const rows = (location: EquipmentLocation, ids: number[]) => ids.map((equipmentId) => ({ profileId, equipmentId, location }));
  await prisma.$transaction([
    prisma.profileEquipment.deleteMany({ where: { profileId } }),
    prisma.profileEquipment.createMany({ data: [...rows("home", home!), ...rows("gym", gym!)] }),
  ]);

  return NextResponse.json(await listEquipment(profileId));
}
