-- DropIndex
DROP INDEX "Purchase_stripeChargeId_key";

-- AlterTable
ALTER TABLE "Purchase" DROP COLUMN "stripeChargeId",
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripePaymentIntentId_key" ON "Purchase"("stripePaymentIntentId");
