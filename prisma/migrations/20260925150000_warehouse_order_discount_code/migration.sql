-- AlterTable
ALTER TABLE "WarehouseOrder" ADD COLUMN "discountCode" TEXT;

-- CreateIndex
CREATE INDEX "WarehouseOrder_discountCode_idx" ON "WarehouseOrder"("discountCode");
