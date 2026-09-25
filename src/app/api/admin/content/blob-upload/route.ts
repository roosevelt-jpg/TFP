import "server-only";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { requireAdminSession } from "@/lib/auth/session";
import { env } from "@/env";

/** 2 GiB — enough for phone 4K vertical masters via multipart client upload. */
export const CONTENT_BLOB_MAX_BYTES = 2 * 1024 * 1024 * 1024;

/**
 * Client-upload token endpoint for Content Studio.
 * Multipart client uploads only — no base64 through the Next.js body.
 */
export async function POST(request: Request) {
  await requireAdminSession(["kane", "lemoni"]);

  if (!env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: "BLOB_READ_WRITE_TOKEN not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      token: env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime", "video/webm"],
        maximumSizeInBytes: CONTENT_BLOB_MAX_BYTES,
        addRandomSuffix: true,
      }),
    });
    return Response.json(json);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "blob upload failed",
      },
      { status: 400 },
    );
  }
}
