-- Content media fields + post-card hold flag (Phase 6 intake / slot publish)
ALTER TABLE "ContentAsset" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "ContentAsset" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "ContentAsset" ADD COLUMN IF NOT EXISTS "byteSize" INTEGER;

ALTER TABLE "PostCard" ADD COLUMN IF NOT EXISTS "held" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "PostCard_held_status_scheduledAt_idx"
  ON "PostCard"("held", "status", "scheduledAt");
