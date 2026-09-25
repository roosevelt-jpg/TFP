-- Part 07-aligned content states (legacy uploaded/posted/rejected remain)
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'published';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'failed';
