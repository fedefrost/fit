"""Catálogo de recetas v3: 20 por proteína principal, 40 colaciones y 50 snacks/comida rápida.

Genera backend/prisma/migrations/20261118000100_recipes_by_protein/migration.sql
Uso: python tools/catalog/recipes_v3.py

Formato de cada receta:
  (slug, comidas, kcal por porción, ml de agua, nombre es, nombre en, resumen es, resumen en, ingredientes)
Ingredientes: "alimento:cantidad+unidad, ..." con unidades g, ml, u (unidad), tbsp, tsp, sl (rebanada), p (pizca).
Los snacks no tienen receta ni ingredientes (se compran listos) y solo son de tipo "junk":
el generador de dietas nunca los propone.
"""

from recipes_v3_data import COLACIONES, JUNK, PROTEINS
from sql import parse_ingredients, q, write_migration

MIGRATION = "20261118000100_recipes_by_protein"


def build():
    recipes = []
    ingredients = []
    for group in PROTEINS.values():
        for slug, types, kcal, water, es, en, sum_es, sum_en, ing in group:
            recipes.append((slug, types, kcal, water, es, en, sum_es, sum_en))
            ingredients += [(slug, food, qty, unit, i + 1) for i, (food, qty, unit) in enumerate(parse_ingredients(ing))]
    for slug, types, kcal, water, es, en, sum_es, sum_en, ing in COLACIONES:
        recipes.append((slug, types, kcal, water, es, en, sum_es, sum_en))
        ingredients += [(slug, food, qty, unit, i + 1) for i, (food, qty, unit) in enumerate(parse_ingredients(ing))]
    for slug, kcal, water, es, en in JUNK:
        recipes.append((slug, "junk", kcal, water, es, en, "", ""))

    slugs = [r[0] for r in recipes]
    duplicates = {s for s in slugs if slugs.count(s) > 1}
    if duplicates:
        raise SystemExit(f"Slugs repetidos: {sorted(duplicates)}")

    rows = ",\n".join(
        f"({q(slug)}, '{{{types}}}', {kcal}, {water}, {q(es)}, {q(en)}, {q(sum_es)}, {q(sum_en)})"
        for slug, types, kcal, water, es, en, sum_es, sum_en in recipes
    )
    ing_rows = ",\n".join(
        f"({q(slug)}, {q(food)}, {qty:g}, {q(unit)}, {pos})" for slug, food, qty, unit, pos in ingredients
    )

    counts = {name: len(group) for name, group in PROTEINS.items()}
    sql = f"""-- GENERADO por tools/catalog/recipes_v3.py: editar ese archivo y volver a generar.
-- Recetas por proteína principal ({', '.join(f'{k}: {v}' for k, v in counts.items())}),
-- {len(COLACIONES)} colaciones y {len(JUNK)} snacks/comida rápida (tipo "junk": sin receta,
-- se registran pero el generador nunca los propone). Calorías y agua por porción, estimadas.

INSERT INTO "recipes" ("slug", "mealTypes", "calories", "waterMl", "nameEs", "nameEn", "summaryEs", "summaryEn") VALUES
{rows}
ON CONFLICT ("slug") DO UPDATE SET
    "mealTypes" = EXCLUDED."mealTypes",
    "calories" = EXCLUDED."calories",
    "waterMl" = EXCLUDED."waterMl",
    "nameEs" = EXCLUDED."nameEs",
    "nameEn" = EXCLUDED."nameEn",
    "summaryEs" = EXCLUDED."summaryEs",
    "summaryEn" = EXCLUDED."summaryEn";

CREATE TEMP TABLE "_recipe_ingredients_seed" (
    "recipe" TEXT NOT NULL,
    "food" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "position" INTEGER NOT NULL
);

INSERT INTO "_recipe_ingredients_seed" ("recipe", "food", "quantity", "unit", "position") VALUES
{ing_rows};

DO $$
DECLARE missing TEXT;
BEGIN
    SELECT string_agg(s."recipe" || ' / ' || s."food", ', ') INTO missing
    FROM "_recipe_ingredients_seed" s
    LEFT JOIN "recipes" r ON r."slug" = s."recipe"
    LEFT JOIN "foods" f ON f."slug" = s."food"
    WHERE r."id" IS NULL OR f."id" IS NULL;

    IF missing IS NOT NULL THEN
        RAISE EXCEPTION 'Ingredientes con receta o alimento inexistente: %', missing;
    END IF;
END $$;

INSERT INTO "recipe_ingredients" ("recipeId", "foodId", "quantity", "unit", "position")
SELECT r."id", f."id", s."quantity", s."unit"::"RecipeUnit", s."position"
FROM "_recipe_ingredients_seed" s
JOIN "recipes" r ON r."slug" = s."recipe"
JOIN "foods" f ON f."slug" = s."food"
ON CONFLICT ("recipeId", "foodId") DO UPDATE SET
    "quantity" = EXCLUDED."quantity",
    "unit" = EXCLUDED."unit",
    "position" = EXCLUDED."position";

DROP TABLE "_recipe_ingredients_seed";
"""
    path = write_migration(MIGRATION, sql)
    print(f"{len(recipes)} recetas, {len(ingredients)} ingredientes -> {path}")


if __name__ == "__main__":
    build()
