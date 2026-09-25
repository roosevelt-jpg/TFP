import "server-only";

import { put } from "@vercel/blob";

import { env } from "@/env";

/** Server-side put path for small files. Prefer client multipart for 4K video. */
const MAX_BYTES = 64 * 1024 * 1024;

/**
 * Store intake media on Vercel Blob (public URL for platform adapters).
 * Requires BLOB_READ_WRITE_TOKEN — local filesystem /uploads is not used
 * (serverless FS is ephemeral).
 *
 * For phone 4K masters use client multipart via
 * `/api/admin/content/blob-upload` (up to 2GiB) and pass mediaUrl to the action.
 */
export async function putContentMedia(input: {
  bytes: Buffer;
  fileName: string;
  contentType: string;
}): Promise<{ url: string; pathname: string; byteSize: number }> {
  if (!env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required for content media uploads",
    );
  }
  if (input.bytes.byteLength < 32) {
    throw new Error("Media file looks empty");
  }
  if (input.bytes.byteLength > MAX_BYTES) {
    throw new Error(
      "Media must be under 64MB on the server path — use multipart client upload for larger files",
    );
  }

  const safeName = input.fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  const pathname = `content/${Date.now()}-${safeName || "asset"}`;

  const blob = await put(pathname, input.bytes, {
    access: "public",
    token: env.BLOB_READ_WRITE_TOKEN,
    contentType: input.contentType,
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    byteSize: input.bytes.byteLength,
  };
}

export const CONTENT_MEDIA_MAX_BYTES = MAX_BYTES;
