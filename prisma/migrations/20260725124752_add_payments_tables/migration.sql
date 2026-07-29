-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused');

-- CreateEnum
CREATE TYPE "ProfileSource" AS ENUM ('waitlist', 'checkout');

-- CreateEnum
CREATE TYPE "StripeEventStatus" AS ENUM ('received', 'enqueued', 'processed', 'skipped', 'failed');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "waitlistId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "goal" "Goal" NOT NULL,
    "level" "Level" NOT NULL,
    "sex" "Sex" NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "weightKg" INTEGER NOT NULL,
    "goalWeightKg" INTEGER,
    "diet" "Diet",
    "injuries" TEXT,
    "source" "ProfileSource" NOT NULL,
    "consentAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentText" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ProgrammeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripeChargeId" TEXT,
    "amountTotal" INTEGER NOT NULL,
    "discountTotal" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "promoCode" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'pending',
    "pdfToken" TEXT NOT NULL,
    "welcomeEmailAt" TIMESTAMPTZ,
    "pdfReadyAt" TIMESTAMPTZ,
    "ghlSyncedAt" TIMESTAMPTZ,
    "capiSentAt" TIMESTAMPTZ,
    "purchasedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMPTZ,
    "currentPeriodEnd" TIMESTAMPTZ,
    "trialEnd" TIMESTAMPTZ,
    "canceledAt" TIMESTAMPTZ,
    "lastStripeEventCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "payload" JSONB,
    "status" "StripeEventStatus" NOT NULL DEFAULT 'received',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeCustomerId_key" ON "Customer"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_waitlistId_idx" ON "Customer"("waitlistId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeProfile_customerId_key" ON "ProgrammeProfile"("customerId");

-- CreateIndex
CREATE INDEX "ProgrammeProfile_customerId_createdAt_idx" ON "ProgrammeProfile"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_ref_key" ON "Purchase"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripeCheckoutSessionId_key" ON "Purchase"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_stripeChargeId_key" ON "Purchase"("stripeChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_pdfToken_key" ON "Purchase"("pdfToken");

-- CreateIndex
CREATE INDEX "Purchase_customerId_idx" ON "Purchase"("customerId");

-- CreateIndex
CREATE INDEX "Purchase_status_createdAt_idx" ON "Purchase"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "StripeEvent_status_receivedAt_idx" ON "StripeEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "StripeEvent_type_receivedAt_idx" ON "StripeEvent"("type", "receivedAt");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_waitlistId_fkey" FOREIGN KEY ("waitlistId") REFERENCES "Waitlist"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgrammeProfile" ADD CONSTRAINT "ProgrammeProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
