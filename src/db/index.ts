import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/env";
import { PrismaClient } from "@/generated/prisma/client";

// Reused across HMR reloads so dev doesn't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Bound the pool per instance so a signup spike queues here rather than
    // opening unbounded connections across Vercel instances (Supavisor fans in).
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: env.DB_POOL_MAX,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
