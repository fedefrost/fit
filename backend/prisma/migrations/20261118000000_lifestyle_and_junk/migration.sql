-- Rutina diaria del perfil (trabajo/estudio): define el gasto de un día normal sin ejercicio.
-- Los perfiles existentes quedan como "office" hasta que se editen.
CREATE TYPE "Lifestyle" AS ENUM ('office', 'standing_work', 'physical_work', 'remote_work', 'part_time', 'student', 'unemployed');

ALTER TABLE "profiles" ADD COLUMN     "lifestyle" "Lifestyle" NOT NULL DEFAULT 'office';

-- Nuevo tipo de comida: snacks y comida rápida (se registran, nunca se recomiendan).
-- Va al final y solo en esta migración: Postgres no permite usar un valor de enum recién
-- agregado dentro de la misma transacción, así que las recetas "junk" se cargan en otra.
ALTER TYPE "MealType" ADD VALUE 'junk';
