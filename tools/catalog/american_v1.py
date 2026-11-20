"""Catálogo americano v1: alimentos típicos de América y recetas que los usan.

Genera backend/prisma/migrations/20261120000100_american_catalog/migration.sql
Uso: python tools/catalog/american_v1.py
Datos en american_v1_data.py (formato explicado allí; "?" marca un ingrediente opcional).
"""

from american_v1_data import FOODS, RECIPES
from sql import parse_ingredients_optional, q, write_migration

MIGRATION = "20261120000100_american_catalog"
MEAL_TYPES = {"breakfast", "lunch", "dinner", "snack"}


def build():
    slugs = [r[0] for r in RECIPES]
    food_slugs = [f[0] for f in FOODS]
    for kind, items in (("recetas", slugs), ("alimentos", food_slugs)):
        duplicates = sorted({s for s in items if items.count(s) > 1})
        if duplicates:
            raise SystemExit(f"Slugs de {kind} repetidos: {duplicates}")

    ingredients = []
    for slug, types, kcal, water, *_texts, spec in RECIPES:
        unknown = set(types.split(",")) - MEAL_TYPES
        if unknown:
            raise SystemExit(f"{slug}: comidas desconocidas {unknown}")
        parsed = parse_ingredients_optional(spec)
        if not any(not optional for *_rest, optional in parsed):
            raise SystemExit(f"{slug}: necesita al menos un ingrediente clave")
        ingredients += [(slug, food, qty, unit, i + 1, optional) for i, (food, qty, unit, optional) in enumerate(parsed)]

    food_rows = ",\n".join(f"({q(slug)}, {q(cat)}, {q(es)}, {q(en)})" for slug, cat, es, en in FOODS)
    recipe_rows = ",\n".join(
        f"({q(slug)}, '{{{types}}}', {kcal}, {water}, {q(es)}, {q(en)}, {q(sum_es)}, {q(sum_en)})"
        for slug, types, kcal, water, es, en, sum_es, sum_en, _spec in RECIPES
    )
    ing_rows = ",\n".join(
        f"({q(slug)}, {q(food)}, {qty:g}, {q(unit)}, {pos}, {q(optional)})"
        for slug, food, qty, unit, pos, optional in ingredients
    )

    sql = f"""-- GENERADO por tools/catalog/american_v1.py: editar american_v1_data.py y volver a generar.
-- {len(FOODS)} alimentos típicos de América (nuevos o con nombre corregido, p. ej. "Zapallo anco")
-- y {len(RECIPES)} recetas que los usan. Los ingredientes marcados "optional" no son clave:
-- si faltan o el perfil los rechaza, la receta se hace igual.

INSERT INTO "foods" ("slug", "category", "nameEs", "nameEn") VALUES
{food_rows}
ON CONFLICT ("slug") DO UPDATE SET
    "category" = EXCLUDED."category",
    "nameEs" = EXCLUDED."nameEs",
    "nameEn" = EXCLUDED."nameEn";

INSERT INTO "recipes" ("slug", "mealTypes", "calories", "waterMl", "nameEs", "nameEn", "summaryEs", "summaryEn") VALUES
{recipe_rows}
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
    "position" INTEGER NOT NULL,
    "optional" BOOLEAN NOT NULL
);

INSERT INTO "_recipe_ingredients_seed" ("recipe", "food", "quantity", "unit", "position", "optional") VALUES
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

INSERT INTO "recipe_ingredients" ("recipeId", "foodId", "quantity", "unit", "position", "optional")
SELECT r."id", f."id", s."quantity", s."unit"::"RecipeUnit", s."position", s."optional"
FROM "_recipe_ingredients_seed" s
JOIN "recipes" r ON r."slug" = s."recipe"
JOIN "foods" f ON f."slug" = s."food"
ON CONFLICT ("recipeId", "foodId") DO UPDATE SET
    "quantity" = EXCLUDED."quantity",
    "unit" = EXCLUDED."unit",
    "position" = EXCLUDED."position",
    "optional" = EXCLUDED."optional";

DROP TABLE "_recipe_ingredients_seed";
"""
    path = write_migration(MIGRATION, sql)
    print(f"{len(FOODS)} alimentos, {len(RECIPES)} recetas, {len(ingredients)} ingredientes -> {path}")


if __name__ == "__main__":
    build()
