-- AlterTable
ALTER TABLE "OutboundMessage" ADD COLUMN IF NOT EXISTS "templateVersion" INTEGER;

CREATE INDEX IF NOT EXISTS "OutboundMessage_providerMessageId_idx" ON "OutboundMessage"("providerMessageId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "MessageTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "metaName" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en_GB',
    "bodyVars" INTEGER NOT NULL DEFAULT 1,
    "buttonUrlCount" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'utility',
    "triggerHint" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MessageTemplate_key_key" ON "MessageTemplate"("key");
CREATE INDEX IF NOT EXISTS "MessageTemplate_enabled_idx" ON "MessageTemplate"("enabled");

INSERT INTO "MessageTemplate" ("id", "key", "label", "description", "metaName", "language", "bodyVars", "buttonUrlCount", "category", "triggerHint", "enabled", "version", "updatedAt")
VALUES
  ('mtpl_waitlist_welcome', 'waitlist_welcome', 'Waitlist welcome', 'Sent when someone joins the waitlist with WhatsApp + consent.', 'waitlist_welcome', 'en_GB', 1, 0, 'lifecycle', 'Waitlist register', true, 1, CURRENT_TIMESTAMP),
  ('mtpl_checkout_recovery', 'checkout_recovery', 'Checkout recovery', '24h abandoned-checkout nudge with track/complete URL button.', 'checkout_recovery', 'en_GB', 1, 1, 'lifecycle', 'Checkout abandoned (24h)', true, 1, CURRENT_TIMESTAMP),
  ('mtpl_purchase_confirmation', 'purchase_confirmation', 'Purchase confirmation', 'Order received — confirmation with success URL button.', 'purchase_confirmation', 'en_GB', 1, 1, 'utility', 'Payment succeeded', true, 1, CURRENT_TIMESTAMP),
  ('mtpl_purchase_activation', 'purchase_activation', 'Purchase activation', 'Start coaching — open success link / message coach.', 'purchase_activation', 'en_GB', 1, 1, 'utility', 'Payment succeeded', true, 1, CURRENT_TIMESTAMP),
  ('mtpl_activation_reminder', 'activation_reminder', 'Activation reminder', '24h after purchase if they have not messaged WhatsApp yet.', 'activation_reminder', 'en_GB', 1, 1, 'utility', 'Onboarding incomplete (24h)', true, 1, CURRENT_TIMESTAMP),
  ('mtpl_service_registered', 'service_registered', 'Service registered', 'Confirmation when a client registers for a paid or booked service.', 'service_registered', 'en_GB', 1, 0, 'utility', 'Service / coaching register', true, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
