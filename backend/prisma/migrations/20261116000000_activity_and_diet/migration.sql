-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "RecipeUnit" AS ENUM ('g', 'ml', 'unit', 'tbsp', 'tsp', 'slice', 'pinch');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('breakfast', 'lunch', 'dinner', 'extra');

-- AlterTable (los perfiles existentes quedan como "sedentary" hasta que se editen)
ALTER TABLE "profiles" ADD COLUMN     "activityLevel" "ActivityLevel" NOT NULL DEFAULT 'sedentary';

-- CreateTable
CREATE TABLE "recipes" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "summaryEs" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "mealTypes" "MealType"[],
    "calories" INTEGER NOT NULL,
    "waterMl" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "recipeId" INTEGER NOT NULL,
    "foodId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "RecipeUnit" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("recipeId","foodId")
);

-- CreateTable
CREATE TABLE "diet_plans" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_meals" (
    "id" SERIAL NOT NULL,
    "planId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "slot" "MealSlot" NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipes_slug_key" ON "recipes"("slug");

-- CreateIndex
CREATE INDEX "recipe_ingredients_foodId_idx" ON "recipe_ingredients"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "diet_plans_profileId_key" ON "diet_plans"("profileId");

-- CreateIndex
CREATE INDEX "diet_meals_planId_date_idx" ON "diet_meals"("planId", "date");

-- CreateIndex
CREATE INDEX "diet_meals_recipeId_idx" ON "diet_meals"("recipeId");

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_plans" ADD CONSTRAINT "diet_plans_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_meals" ADD CONSTRAINT "diet_meals_planId_fkey" FOREIGN KEY ("planId") REFERENCES "diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_meals" ADD CONSTRAINT "diet_meals_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
