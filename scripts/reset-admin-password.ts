/**
 * Reset Kane admin password using ADMIN_BOOTSTRAP_* against DATABASE_URL.
 * Usage: node --import tsx scripts/reset-admin-password.ts
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: [".env.neon.tmp", ".env.local", ".env"], quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const name = process.env.ADMIN_BOOTSTRAP_NAME ?? "Kane Mousah";

if (!databaseUrl) throw new Error("DATABASE_URL missing");
if (!email || !password) throw new Error("ADMIN_BOOTSTRAP_EMAIL/PASSWORD missing");
const bootstrapEmail = email;
const bootstrapPassword = password;
if (bootstrapPassword === "[SENSITIVE]" || bootstrapPassword.length < 12) {
  throw new Error("Refusing to set redacted/short password");
}
if (databaseUrl.includes("[SENSITIVE]")) {
  throw new Error("DATABASE_URL looks redacted");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const db = new PrismaClient({ adapter });

async function main() {
  const hashed = await hashPassword(bootstrapPassword);
  let user = await db.user.findUnique({ where: { email: bootstrapEmail } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: bootstrapEmail,
        name,
        emailVerified: true,
        role: "kane",
        twoFactorEnabled: false,
      },
    });
    console.log(`Created user ${email}`);
  } else {
    await db.user.update({
      where: { id: user.id },
      data: { role: "kane", name, emailVerified: true, twoFactorEnabled: false },
    });
    console.log(`Updated user ${email}`);
  }

  const account = await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (account) {
    await db.account.update({
      where: { id: account.id },
      data: { password: hashed },
    });
    console.log("Password updated on credential account");
  } else {
    await db.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    console.log("Credential account created");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
