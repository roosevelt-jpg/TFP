-- AlterTable MessageTemplate: channel + media + IG body
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'whatsapp';
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "bodyText" TEXT;
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "headerMediaType" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "MessageTemplate" ADD COLUMN IF NOT EXISTS "headerMediaUrl" TEXT;

CREATE INDEX IF NOT EXISTS "MessageTemplate_channel_enabled_idx" ON "MessageTemplate"("channel", "enabled");

-- Seed Instagram DM templates (admin-managed auto-ack copy)
INSERT INTO "MessageTemplate" ("id", "channel", "key", "label", "description", "metaName", "language", "bodyText", "bodyVars", "buttonUrlCount", "headerMediaType", "headerMediaUrl", "category", "triggerHint", "enabled", "version", "updatedAt")
VALUES
  (
    'mtpl_ig_inbound_ack',
    'instagram',
    'ig_inbound_ack',
    'IG inbound auto-ack',
    'Auto-reply when someone DMs the business Instagram account.',
    'ig_inbound_ack',
    'en_GB',
    'Thanks — the Formula team has your message. For coaching, WhatsApp is fastest once you’re on the programme.',
    0,
    0,
    'none',
    NULL,
    'lifecycle',
    'Instagram inbound DM',
    true,
    1,
    CURRENT_TIMESTAMP
  ),
  (
    'mtpl_ig_high_intent',
    'instagram',
    'ig_high_intent',
    'IG high-intent nudge',
    'Optional follow-up copy when a DM looks like purchase intent.',
    'ig_high_intent',
    'en_GB',
    'Want the programme details? Reply here or join via the link in bio — we’ll get you set up on WhatsApp.',
    0,
    0,
    'none',
    NULL,
    'lifecycle',
    'Instagram high-intent keyword',
    true,
    1,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("key") DO NOTHING;
