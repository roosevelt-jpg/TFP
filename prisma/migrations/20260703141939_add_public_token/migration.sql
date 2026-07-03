/*
  Warnings:

  - A unique constraint covering the columns `[publicToken]` on the table `Waitlist` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publicToken` to the `Waitlist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Waitlist" ADD COLUMN     "publicToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_publicToken_key" ON "Waitlist"("publicToken");
