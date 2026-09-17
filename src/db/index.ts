import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

// Versioned so HMR after `prisma generate` does not keep a stale client
// missing new models (e.g. integrationSecret).
const globalForPrisma = globalThis as unknown as {
  prismaCommand?: PrismaClient;
  prismaCommandGen?: number;
};
const PRISMA_CLIENT_GEN = 5;

export const db =
  globalForPrisma.prismaCommandGen === PRISMA_CLIENT_GEN &&
  globalForPrisma.prismaCommand
    ? globalForPrisma.prismaCommand
    : new PrismaClient({
        // Bound the pool per instance so a signup spike queues here rather than
        // opening unbounded connections across Vercel instances (Supavisor fans in).
        adapter: new PrismaPg({
          connectionString: env.DATABASE_URL,
          max: env.DB_POOL_MAX,
          connectionTimeoutMillis: 10_000,
          idleTimeoutMillis: 10_000,
        }),
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaCommand = db;
  globalForPrisma.prismaCommandGen = PRISMA_CLIENT_GEN;
}
