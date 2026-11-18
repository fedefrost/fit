"""Catálogo de ejercicios v2: 10 equipos nuevos y 275 ejercicios (20 por equipo y 20 de peso
corporal en total, sumando los del primer catálogo).

Genera la migración backend/prisma/migrations/20261118000200_exercise_catalog_v2/migration.sql
y expone `animations()` para generate.py.

Uso:
  python tools/exercise-animations/catalog_v2.py   # escribe la migración
  python tools/exercise-animations/generate.py     # genera PNG/GIF
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "catalog"))

from catalog_v2_a import EX as EX_A  # noqa: E402
from catalog_v2_b import EX as EX_B  # noqa: E402
from catalog_v2_c import EX as EX_C  # noqa: E402
from catalog_v2_d import EX as EX_D  # noqa: E402
from sql import q, write_migration  # noqa: E402

MIGRATION = "20261118000200_exercise_catalog_v2"

EQUIPMENT = [
    ("kettlebell", "Pesa rusa (kettlebell)", "Kettlebell"),
    ("resistance_band", "Banda elástica", "Resistance band"),
    ("cable_machine", "Máquina de poleas", "Cable machine"),
    ("treadmill", "Cinta de correr", "Treadmill"),
    ("elliptical", "Elíptica", "Elliptical trainer"),
    ("rowing_machine", "Remo ergómetro", "Rowing machine"),
    ("leg_press", "Prensa de piernas", "Leg press machine"),
    ("jump_rope", "Soga para saltar", "Jump rope"),
    ("stability_ball", "Pelota de estabilidad (fitball)", "Stability ball"),
    ("medicine_ball", "Pelota medicinal", "Medicine ball"),
]

EXERCISES = EX_A + EX_B + EX_C + EX_D
MEASURES = {"t": "time", "r": "reps", "rw": "reps_weight"}


def animations():
    return {entry[0]: entry[13]() for entry in EXERCISES}


def build():
    slugs = [entry[0] for entry in EXERCISES]
    duplicates = sorted({s for s in slugs if slugs.count(s) > 1})
    if duplicates:
        raise SystemExit(f"Slugs repetidos: {duplicates}")

    rows = []
    requirements = []
    for slug, equipment, muscle, measure, met, base, spr, load, impact, es, en, ies, ien, _ in EXERCISES:
        kind = MEASURES[measure]
        minutes = base if kind == "time" else None
        reps = int(base) if kind != "time" else None
        rows.append(
            f"({q(slug)}, {q(muscle)}, {q(kind)}, {met}, {q(minutes)}, {q(reps)}, {spr}, {q(load)}, {q(impact)}, "
            f"{q(es)}, {q(en)}, {q(ies)}, {q(ien)})"
        )
        requirements += [(slug, item) for item in equipment.split("+") if item]

    equipment_rows = ",\n".join(f"({q(s)}, {q(es)}, {q(en)})" for s, es, en in EQUIPMENT)
    exercise_rows = ",\n".join(rows)
    requirement_rows = ",\n".join(f"({q(s)}, {q(e)})" for s, e in requirements)

    sql = f"""-- GENERADO por tools/exercise-animations/catalog_v2.py: editar ese archivo y volver a generar.
-- {len(EQUIPMENT)} equipos nuevos y {len(EXERCISES)} ejercicios (animaciones en frontend/public/exercises).

INSERT INTO "equipment" ("slug", "nameEs", "nameEn") VALUES
{equipment_rows}
ON CONFLICT ("slug") DO UPDATE SET "nameEs" = EXCLUDED."nameEs", "nameEn" = EXCLUDED."nameEn";

INSERT INTO "exercises" ("slug", "muscle", "measure", "met", "baseMinutes", "baseReps", "secondsPerRep", "loadFactor", "highImpact", "nameEs", "nameEn", "instructionsEs", "instructionsEn") VALUES
{exercise_rows}
ON CONFLICT ("slug") DO UPDATE SET
    "muscle" = EXCLUDED."muscle",
    "measure" = EXCLUDED."measure",
    "met" = EXCLUDED."met",
    "baseMinutes" = EXCLUDED."baseMinutes",
    "baseReps" = EXCLUDED."baseReps",
    "secondsPerRep" = EXCLUDED."secondsPerRep",
    "loadFactor" = EXCLUDED."loadFactor",
    "highImpact" = EXCLUDED."highImpact",
    "nameEs" = EXCLUDED."nameEs",
    "nameEn" = EXCLUDED."nameEn",
    "instructionsEs" = EXCLUDED."instructionsEs",
    "instructionsEn" = EXCLUDED."instructionsEn";

CREATE TEMP TABLE "_exercise_equipment_seed" ("exercise" TEXT NOT NULL, "equipment" TEXT NOT NULL);

INSERT INTO "_exercise_equipment_seed" ("exercise", "equipment") VALUES
{requirement_rows};

DO $$
DECLARE missing TEXT;
BEGIN
    SELECT string_agg(s."exercise" || ' / ' || s."equipment", ', ') INTO missing
    FROM "_exercise_equipment_seed" s
    LEFT JOIN "exercises" x ON x."slug" = s."exercise"
    LEFT JOIN "equipment" e ON e."slug" = s."equipment"
    WHERE x."id" IS NULL OR e."id" IS NULL;

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'Equipamiento con ejercicio o equipo inexistente: %', missing;
    END IF;
END $$;

INSERT INTO "exercise_equipment" ("exerciseId", "equipmentId")
SELECT x."id", e."id"
FROM "_exercise_equipment_seed" s
JOIN "exercises" x ON x."slug" = s."exercise"
JOIN "equipment" e ON e."slug" = s."equipment"
ON CONFLICT DO NOTHING;

DROP TABLE "_exercise_equipment_seed";
"""
    path = write_migration(MIGRATION, sql)
    print(f"{len(EQUIPMENT)} equipos, {len(EXERCISES)} ejercicios, {len(requirements)} requisitos -> {path}")


if __name__ == "__main__":
    build()
