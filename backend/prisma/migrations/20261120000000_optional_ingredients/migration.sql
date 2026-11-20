-- Ingredientes opcionales: una receta se puede hacer aunque falte (o el perfil rechace) un
-- ingrediente que no es clave, p. ej. el comino de un guiso o la cebolla de una ensalada.
ALTER TABLE "recipe_ingredients" ADD COLUMN "optional" BOOLEAN NOT NULL DEFAULT false;

-- Marca automática del catálogo existente (las recetas nuevas lo indican una por una).
-- Solo en recetas de 3 o más ingredientes y que no sean bebidas (té, mate, café...), son opcionales:
-- - hierbas, especias y condimentos (sal, comino, pimentón, aceitunas, salsa de soja...);
-- - aceites, grasas y endulzantes en cantidades chicas (hasta ~20 g: una cucharada);
-- - frutos secos, semillas y lácteos usados como topping (hasta ~15 g);
-- - las verduras y frutas que no son la principal (la principal es la de más peso estimado).
-- Proteínas, cereales, legumbres y la verdura o fruta principal siguen siendo clave.
WITH "weighted" AS (
    SELECT
        ri."recipeId",
        ri."foodId",
        ri."position",
        f."category",
        -- peso aproximado en gramos para comparar ingredientes con unidades distintas
        CASE ri."unit"
            WHEN 'g' THEN ri."quantity"
            WHEN 'ml' THEN ri."quantity"
            WHEN 'unit' THEN ri."quantity" * CASE
                WHEN f."slug" = 'garlic' OR f."category" = 'herbs_spices' THEN 5
                WHEN f."slug" IN ('lemon', 'lime') THEN 60
                ELSE 100 END
            WHEN 'tbsp' THEN ri."quantity" * 15
            WHEN 'tsp' THEN ri."quantity" * 5
            WHEN 'slice' THEN ri."quantity" * 30
            ELSE ri."quantity" * 0.5
        END AS "grams",
        count(*) OVER (PARTITION BY ri."recipeId") AS "ingredientCount",
        bool_or(f."category" = 'beverages') OVER (PARTITION BY ri."recipeId") AS "isDrink"
    FROM "recipe_ingredients" ri
    JOIN "foods" f ON f."id" = ri."foodId"
),
"ranked" AS (
    SELECT
        w.*,
        row_number() OVER (
            PARTITION BY w."recipeId", (w."category" IN ('vegetables', 'fruits'))
            ORDER BY w."grams" DESC, w."position"
        ) AS "produceRank"
    FROM "weighted" w
)
UPDATE "recipe_ingredients" ri
SET "optional" = true
FROM "ranked" r
WHERE ri."recipeId" = r."recipeId"
  AND ri."foodId" = r."foodId"
  AND r."ingredientCount" >= 3
  AND NOT r."isDrink"
  AND (
      r."category" IN ('herbs_spices', 'condiments')
      OR (r."category" IN ('oils_fats', 'sweets') AND r."grams" <= 20)
      OR (r."category" IN ('nuts_seeds', 'dairy') AND r."grams" <= 15)
      OR (r."category" IN ('vegetables', 'fruits') AND r."produceRank" > 1)
  );

-- Toda receta conserva al menos un ingrediente clave: si quedaron todos opcionales (p. ej. un mix
-- de frutos secos en cantidades chicas), el de mayor cantidad vuelve a ser clave.
UPDATE "recipe_ingredients" ri
SET "optional" = false
FROM (
    SELECT DISTINCT ON (c."recipeId") c."recipeId", c."foodId"
    FROM "recipe_ingredients" c
    WHERE NOT EXISTS (
        SELECT 1 FROM "recipe_ingredients" k WHERE k."recipeId" = c."recipeId" AND NOT k."optional"
    )
    ORDER BY c."recipeId", c."quantity" DESC, c."position"
) top
WHERE ri."recipeId" = top."recipeId" AND ri."foodId" = top."foodId";
