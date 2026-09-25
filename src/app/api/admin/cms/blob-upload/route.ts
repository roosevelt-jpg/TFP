import "server-only";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { requireAdminSession } from "@/lib/auth/session";
import { env } from "@/env";

/** Landing CMS images — direct client upload to Blob. */
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
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/svg+xml",
        ],
        maximumSizeInBytes: 8 * 1024 * 1024,
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
