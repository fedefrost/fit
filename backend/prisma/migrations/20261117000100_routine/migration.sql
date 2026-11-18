-- CreateEnum
CREATE TYPE "EquipmentLocation" AS ENUM ('home', 'gym');

-- CreateEnum
CREATE TYPE "Muscle" AS ENUM ('legs', 'biceps', 'triceps', 'glutes', 'chest', 'back', 'abs', 'shoulders', 'general');

-- CreateEnum
CREATE TYPE "ExerciseMeasure" AS ENUM ('time', 'reps', 'reps_weight');

-- CreateEnum
CREATE TYPE "WorkoutSource" AS ENUM ('planned', 'extra');

-- CreateTable
CREATE TABLE "equipment" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_equipment" (
    "profileId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "location" "EquipmentLocation" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_equipment_pkey" PRIMARY KEY ("profileId","equipmentId","location")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "instructionsEs" TEXT NOT NULL,
    "instructionsEn" TEXT NOT NULL,
    "muscle" "Muscle" NOT NULL,
    "measure" "ExerciseMeasure" NOT NULL,
    "met" DOUBLE PRECISION NOT NULL,
    "baseMinutes" DOUBLE PRECISION,
    "baseReps" INTEGER,
    "secondsPerRep" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "loadFactor" DOUBLE PRECISION,
    "highImpact" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_equipment" (
    "exerciseId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,

    CONSTRAINT "exercise_equipment_pkey" PRIMARY KEY ("exerciseId","equipmentId")
);

-- CreateTable
CREATE TABLE "workout_days" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "location" "EquipmentLocation" NOT NULL,
    "muscles" "Muscle"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "id" SERIAL NOT NULL,
    "dayId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "source" "WorkoutSource" NOT NULL,
    "minutes" DOUBLE PRECISION,
    "sets" INTEGER,
    "reps" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_slug_key" ON "equipment"("slug");

-- CreateIndex
CREATE INDEX "profile_equipment_equipmentId_idx" ON "profile_equipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises"("slug");

-- CreateIndex
CREATE INDEX "exercise_equipment_equipmentId_idx" ON "exercise_equipment"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "workout_days_profileId_date_key" ON "workout_days"("profileId", "date");

-- CreateIndex
CREATE INDEX "workout_exercises_dayId_idx" ON "workout_exercises"("dayId");

-- CreateIndex
CREATE INDEX "workout_exercises_exerciseId_idx" ON "workout_exercises"("exerciseId");

-- AddForeignKey
ALTER TABLE "profile_equipment" ADD CONSTRAINT "profile_equipment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_equipment" ADD CONSTRAINT "profile_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

