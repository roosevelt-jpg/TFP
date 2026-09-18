import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { get, put } from "@vercel/blob";

import { env } from "@/env";

/** Content-ID used in every branded email (`src="cid:…"`). */
export const EMAIL_LOGO_CID = "tfp-performance-logo";
export const EMAIL_LOGO_FILENAME = "performance-logo.png";
export const EMAIL_LOGO_BLOB_PATH = "branding/email-logo.png";

const LOCAL_LOGO_PATH = path.join(process.cwd(), "public", "email", "logo.png");

const store = () => {
  if (!env.FORMULA_BLOB_STORE_ID || !env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Blob store credentials are not configured");
  }
  return {
    access: "private" as const,
    storeId: env.FORMULA_BLOB_STORE_ID,
    token: env.BLOB_READ_WRITE_TOKEN,
  };
};

/** Img src for templates — always the uploaded file via CID, never a URL. */
export function emailLogoSrc() {
  return `cid:${EMAIL_LOGO_CID}`;
}

export async function readEmailLogoBytes(): Promise<Buffer> {
  try {
    const blob = await get(EMAIL_LOGO_BLOB_PATH, store());
    if (blob) {
      return Buffer.from(await new Response(blob.stream).arrayBuffer());
    }
  } catch {
    // Fall through to local file (dev / first deploy before Kane uploads).
  }

  try {
    return await readFile(LOCAL_LOGO_PATH);
  } catch {
    throw new Error(
      "Performance email logo is missing. Upload a PNG under Integrations → Email branding.",
    );
  }
}

export async function uploadEmailLogo(bytes: Buffer, contentType: string) {
  if (!contentType.startsWith("image/")) {
    throw new Error("Logo must be an image file (PNG preferred)");
  }
  if (bytes.byteLength > 2_000_000) {
    throw new Error("Logo must be under 2MB");
  }

  await put(EMAIL_LOGO_BLOB_PATH, bytes, {
    ...store(),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  // Keep local copy in sync for Trigger/dev when the filesystem is writable.
  try {
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(LOCAL_LOGO_PATH), { recursive: true });
    await writeFile(LOCAL_LOGO_PATH, bytes);
  } catch {
    // Vercel serverless FS is read-only — blob is the source of truth.
  }
}

export async function emailLogoStatus(): Promise<{
  configured: boolean;
  source: "blob" | "local" | "missing";
  bytes: number | null;
}> {
  try {
    const blob = await get(EMAIL_LOGO_BLOB_PATH, store());
    if (blob) {
      const buf = Buffer.from(await new Response(blob.stream).arrayBuffer());
      return { configured: true, source: "blob", bytes: buf.byteLength };
    }
  } catch {
    // ignore
  }

  try {
    const buf = await readFile(LOCAL_LOGO_PATH);
    return { configured: true, source: "local", bytes: buf.byteLength };
  } catch {
    return { configured: false, source: "missing", bytes: null };
  }
}

export function emailLogoAttachment(content: Buffer) {
  return {
    filename: EMAIL_LOGO_FILENAME,
    content,
    contentType: "image/png" as const,
    contentId: EMAIL_LOGO_CID,
  };
}
