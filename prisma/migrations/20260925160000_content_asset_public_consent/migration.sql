-- ContentAsset public consent (Part 07 §7.5 consent / licence gate)
ALTER TABLE "ContentAsset" ADD COLUMN IF NOT EXISTS "publicConsent" BOOLEAN NOT NULL DEFAULT false;
