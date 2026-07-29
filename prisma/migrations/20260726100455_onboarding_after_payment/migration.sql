/*
  Warnings:

  - You are about to drop the `ProgrammeProfile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `consentText` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `policyVersion` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `whatsapp` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProgrammeProfile" DROP CONSTRAINT "ProgrammeProfile_customerId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "consentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "consentText" TEXT NOT NULL,
ADD COLUMN     "policyVersion" TEXT NOT NULL,
ADD COLUMN     "whatsapp" TEXT NOT NULL;

-- DropTable
DROP TABLE "ProgrammeProfile";

-- DropEnum
DROP TYPE "ProfileSource";

-- CreateTable
CREATE TABLE "CoachingProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "goal" "Goal",
    "level" "Level",
    "sex" "Sex",
    "age" INTEGER,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "goalWeightKg" INTEGER,
    "diet" "Diet",
    "injuries" TEXT,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CoachingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachingProfile_customerId_key" ON "CoachingProfile"("customerId");

-- AddForeignKey
ALTER TABLE "CoachingProfile" ADD CONSTRAINT "CoachingProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
