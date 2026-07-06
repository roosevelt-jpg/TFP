import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

import { PrismaClient } from "../../src/generated/prisma/client";
import { SEEDED_PUBLIC_TOKEN, SEEDED_REF } from "./fixtures";

// Runs under tsx (see global-setup.ts) — Playwright's own TS loader can't
// evaluate the generated Prisma client.
loadEnv({ path: [".env.local", ".env"], quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

// Hard guard: E2E seeding must never touch a remote database.
const host = new URL(databaseUrl).hostname;

if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(`E2E seeding requires a local DATABASE_URL (got ${host})`);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl, max: 1 }),
});

// Same values in update so a drifted row on a long-lived local DB self-heals.
const lead = {
  ref: SEEDED_REF,
  publicToken: SEEDED_PUBLIC_TOKEN,
  name: "E2E Seed",
  email: "e2e-seed@example.com",
  whatsapp: "+447911123456",
  goal: "lose",
  level: "beg",
  sex: "female",
  age: 28,
  heightCm: 165,
  weightKg: 60,
  consentAt: new Date(),
  consentText: "e2e seed",
  policyVersion: "e2e",
} as const;

async function main(): Promise<void> {
  await db.waitlist.upsert({
    where: { email: lead.email },
    create: lead,
    update: lead,
  });
}

main()
  .then(() => db.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
