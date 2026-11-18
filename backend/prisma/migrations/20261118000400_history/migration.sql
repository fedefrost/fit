-- Historial: se conservan las dietas de todas las semanas (una por semana y perfil) y se
-- guardan los objetivos recomendados de cada semana. Las dietas existentes quedan con los
-- objetivos en NULL; el historial los calcula con los datos actuales del perfil.

-- DropIndex
DROP INDEX "diet_plans_profileId_key";

-- AlterTable
ALTER TABLE "diet_plans" ADD COLUMN     "baselineBurn" INTEGER,
ADD COLUMN     "targetCalories" INTEGER,
ADD COLUMN     "targetWaterMl" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "diet_plans_profileId_weekStart_key" ON "diet_plans"("profileId", "weekStart");
