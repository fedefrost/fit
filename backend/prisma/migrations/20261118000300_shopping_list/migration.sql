-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "weekStart" DATE NOT NULL,
    "people" INTEGER NOT NULL DEFAULT 1,
    "days" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_checks" (
    "listId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "shopping_checks_pkey" PRIMARY KEY ("listId","key")
);

-- CreateTable
CREATE TABLE "shopping_items" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "foodId" INTEGER,
    "name" TEXT,
    "amount" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shopping_lists_profileId_key" ON "shopping_lists"("profileId");

-- CreateIndex
CREATE INDEX "shopping_items_listId_idx" ON "shopping_items"("listId");

-- CreateIndex
CREATE INDEX "shopping_items_foodId_idx" ON "shopping_items"("foodId");

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_checks" ADD CONSTRAINT "shopping_checks_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

