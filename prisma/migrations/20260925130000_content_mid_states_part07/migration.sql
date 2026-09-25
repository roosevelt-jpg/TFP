-- Part 07 mid-pipeline content states
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'in_plan';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'brief_locked';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'in_edit';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'in_qc';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'changes_requested';
ALTER TYPE "ContentAssetState" ADD VALUE IF NOT EXISTS 'ready';
