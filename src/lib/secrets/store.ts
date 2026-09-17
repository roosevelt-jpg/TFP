import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { db } from "@/db";
import { env } from "@/env";

function encryptionKey() {
  return createHash("sha256").update(env.BETTER_AUTH_SECRET).digest();
}

function encrypt(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    lastFour: plaintext.slice(-4),
  };
}

function decrypt(row: { ciphertext: string; iv: string; tag: string }) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(row.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function upsertIntegrationSecret(input: {
  key: string;
  value: string;
  updatedBy: string;
}) {
  const value = input.value.trim();
  if (!value) {
    throw new Error("Credential value cannot be empty");
  }
  const packed = encrypt(value);
  return db.integrationSecret.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      ...packed,
      updatedBy: input.updatedBy,
    },
    update: {
      ...packed,
      updatedBy: input.updatedBy,
    },
  });
}

export async function deleteIntegrationSecret(key: string) {
  await db.integrationSecret.deleteMany({ where: { key } });
}

export async function readIntegrationSecret(key: string): Promise<string | null> {
  const row = await db.integrationSecret.findUnique({ where: { key } });
  if (!row) return null;
  return decrypt(row);
}

/** DB secret wins; falls back to process env. */
export async function resolveSecret(key: string): Promise<string | undefined> {
  const fromDb = await readIntegrationSecret(key);
  if (fromDb) return fromDb;
  const fromProcess = process.env[key];
  if (fromProcess && fromProcess.length > 0) return fromProcess;
  return undefined;
}

export type SecretStatus = {
  key: string;
  configured: boolean;
  source: "database" | "env" | "missing";
  lastFour: string | null;
  updatedAt: string | null;
};

export async function listSecretStatuses(
  keys: readonly string[],
): Promise<SecretStatus[]> {
  const rows = await db.integrationSecret.findMany({
    where: { key: { in: [...keys] } },
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return keys.map((key) => {
    const row = byKey.get(key);
    if (row) {
      return {
        key,
        configured: true,
        source: "database" as const,
        lastFour: row.lastFour,
        updatedAt: row.updatedAt.toISOString(),
      };
    }
    const envVal = process.env[key];
    if (typeof envVal === "string" && envVal.length > 0) {
      return {
        key,
        configured: true,
        source: "env" as const,
        lastFour: envVal.slice(-4),
        updatedAt: null,
      };
    }
    return {
      key,
      configured: false,
      source: "missing" as const,
      lastFour: null,
      updatedAt: null,
    };
  });
}
