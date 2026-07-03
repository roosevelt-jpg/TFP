/*
  Warnings:

  - You are about to drop the column `source` on the `Waitlist` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Waitlist" DROP COLUMN "source";

-- Data-API hardening (Supabase). The Waitlist table is Prisma-owned and must
-- never be reachable through Supabase's auto-generated PostgREST anon/service
-- Data API. RLS with no policies denies those roles; the grant revoke is the
-- second layer Supabase recommends bundling here. Prisma connects as the table
-- owner (which bypasses RLS), so app reads/writes are unaffected.
ALTER TABLE "Waitlist" ENABLE ROW LEVEL SECURITY;

-- Revoke only from roles that exist, so this also applies cleanly on local
-- Postgres where the Supabase roles (anon/authenticated) aren't present.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "Waitlist" FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "Waitlist" FROM authenticated;
  END IF;
END
$$;
