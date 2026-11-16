-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('vegetables', 'fruits', 'legumes', 'plant_proteins', 'grains', 'meat', 'poultry', 'eggs', 'fish_seafood', 'dairy', 'dairy_alternatives', 'nuts_seeds', 'herbs_spices', 'oils_fats', 'sweets', 'condiments', 'beverages');

-- CreateEnum
CREATE TYPE "FoodPreference" AS ENUM ('preferred', 'rejected');

-- CreateTable
CREATE TABLE "foods" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "foods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_foods" (
    "profileId" INTEGER NOT NULL,
    "foodId" INTEGER NOT NULL,
    "preference" "FoodPreference" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_foods_pkey" PRIMARY KEY ("profileId","foodId")
);

-- CreateIndex
CREATE UNIQUE INDEX "foods_slug_key" ON "foods"("slug");

-- CreateIndex
CREATE INDEX "profile_foods_foodId_idx" ON "profile_foods"("foodId");

-- AddForeignKey
ALTER TABLE "profile_foods" ADD CONSTRAINT "profile_foods_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_foods" ADD CONSTRAINT "profile_foods_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
