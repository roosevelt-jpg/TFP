import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Single instance across HMR reloads in dev (avoids connection exhaustion). The
// adapter (with its pg pool) is only built when a client is actually created —
// DATABASE_URL is the pooled/runtime connection (Prisma v7 driver adapter).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
