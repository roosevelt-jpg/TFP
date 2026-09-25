import "server-only";

import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";

const FRAME_API = "https://api.frame.io/v4";

export type FrameAssetMeta = {
  id: string;
  name?: string;
  status?: string;
  /** Best-effort text pulled from Frame custom metadata / comments. */
  transcript?: string;
  ocr?: string;
  onScreenText?: string;
  caption?: string;
  raw?: unknown;
};

async function frameToken(): Promise<string | undefined> {
  return (
    (await resolveSecret("FRAME_IO_TOKEN")) ?? process.env.FRAME_IO_TOKEN
  );
}

async function frameAccountId(): Promise<string | undefined> {
  return (
    (await resolveSecret("FRAME_IO_ACCOUNT_ID")) ??
    process.env.FRAME_IO_ACCOUNT_ID
  );
}

async function authHeaders(): Promise<HeadersInit | null> {
  const token = await frameToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

/** List Frame.io accounts visible to FRAME_IO_TOKEN. */
export async function listFrameAccounts(): Promise<
  Array<{ id: string; name?: string }>
> {
  const headers = await authHeaders();
  if (!headers) return [];

  const res = await fetch(`${FRAME_API}/accounts`, { headers });
  if (!res.ok) {
    logger.warn("Frame.io list accounts failed", { status: res.status });
    return [];
  }
  const body = (await res.json()) as {
    data?: Array<{ id?: string; name?: string }>;
  };
  return (body.data ?? [])
    .filter((a): a is { id: string; name?: string } => Boolean(a.id))
    .map((a) => ({ id: a.id, name: a.name }));
}

async function resolveAccountId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const fromEnv = await frameAccountId();
  if (fromEnv) return fromEnv;
  const accounts = await listFrameAccounts();
  return accounts[0]?.id ?? null;
}

function pickMetaText(
  metadata: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const direct = metadata[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const nested = metadata[key];
    if (
      nested &&
      typeof nested === "object" &&
      "value" in (nested as object) &&
      typeof (nested as { value: unknown }).value === "string"
    ) {
      const v = (nested as { value: string }).value.trim();
      if (v) return v;
    }
  }
  // Case-insensitive key scan
  const lower = Object.fromEntries(
    Object.entries(metadata).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const key of keys) {
    const v = lower[key.toLowerCase()];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function toAssetMeta(
  fileId: string,
  data: Record<string, unknown>,
): FrameAssetMeta {
  const metadata =
    (data.metadata as Record<string, unknown> | undefined) ??
    (data.custom_metadata as Record<string, unknown> | undefined);

  return {
    id: (typeof data.id === "string" ? data.id : fileId) || fileId,
    name: typeof data.name === "string" ? data.name : undefined,
    status:
      typeof data.status === "string"
        ? data.status
        : typeof data.label === "string"
          ? data.label
          : undefined,
    transcript: pickMetaText(metadata, [
      "transcript",
      "Transcript",
      "asr",
      "captions",
    ]),
    ocr: pickMetaText(metadata, ["ocr", "OCR", "on_screen_text", "burned_in"]),
    onScreenText: pickMetaText(metadata, [
      "onScreenText",
      "on_screen_text",
      "ocr",
      "OCR",
    ]),
    caption: pickMetaText(metadata, ["caption", "Caption", "description"]),
    raw: data,
  };
}

/**
 * Get a Frame.io V4 file (asset) by id.
 * Requires FRAME_IO_TOKEN; account id from arg, FRAME_IO_ACCOUNT_ID, or first account.
 */
export async function getFrameAsset(
  fileId: string,
  opts?: { accountId?: string },
): Promise<FrameAssetMeta | null> {
  const headers = await authHeaders();
  if (!headers) {
    logger.info("FRAME_IO_TOKEN missing — skip Frame asset fetch");
    return null;
  }

  const accountId = await resolveAccountId(opts?.accountId);
  if (!accountId) {
    logger.warn("Frame.io account id unresolved — cannot get asset", {
      fileId,
    });
    return null;
  }

  const url = new URL(
    `${FRAME_API}/accounts/${accountId}/files/${encodeURIComponent(fileId)}`,
  );
  url.searchParams.set("include", "metadata");

  const res = await fetch(url, { headers });
  if (!res.ok) {
    logger.warn("Frame.io get file failed", {
      fileId,
      status: res.status,
    });
    return null;
  }

  const body = (await res.json()) as {
    data?: Record<string, unknown>;
  };
  if (!body.data) return null;
  return toAssetMeta(fileId, body.data);
}

/**
 * List children (files/folders) under a Frame.io folder.
 */
export async function listFrameAssets(
  folderId: string,
  opts?: { accountId?: string; pageSize?: number },
): Promise<FrameAssetMeta[]> {
  const headers = await authHeaders();
  if (!headers) return [];

  const accountId = await resolveAccountId(opts?.accountId);
  if (!accountId) return [];

  const url = new URL(
    `${FRAME_API}/accounts/${accountId}/folders/${encodeURIComponent(folderId)}/children`,
  );
  url.searchParams.set("page_size", String(opts?.pageSize ?? 50));
  url.searchParams.set("include", "metadata");

  const res = await fetch(url, { headers });
  if (!res.ok) {
    logger.warn("Frame.io list folder children failed", {
      folderId,
      status: res.status,
    });
    return [];
  }

  const body = (await res.json()) as {
    data?: Array<Record<string, unknown>>;
  };
  return (body.data ?? []).map((row) =>
    toAssetMeta(typeof row.id === "string" ? row.id : folderId, row),
  );
}

/**
 * Enrichment bag suitable for ContentAsset.tags / compliance assetMeta.
 */
export function frameMetaToComplianceBag(meta: FrameAssetMeta): {
  transcript?: string;
  ocr?: string;
  onScreenText?: string;
  caption?: string;
  frameAssetId: string;
  frameName?: string;
  frameStatus?: string;
} {
  return {
    frameAssetId: meta.id,
    frameName: meta.name,
    frameStatus: meta.status,
    ...(meta.transcript ? { transcript: meta.transcript } : {}),
    ...(meta.ocr ? { ocr: meta.ocr } : {}),
    ...(meta.onScreenText ? { onScreenText: meta.onScreenText } : {}),
    ...(meta.caption ? { caption: meta.caption } : {}),
  };
}

async function frameFolderId(): Promise<string | undefined> {
  return (
    (await resolveSecret("FRAME_IO_FOLDER_ID")) ??
    process.env.FRAME_IO_FOLDER_ID
  );
}

/**
 * Create a Frame.io file via remote upload from a public source URL.
 * Requires FRAME_IO_TOKEN + folder id (FRAME_IO_FOLDER_ID). Returns null when
 * credentials/folder are missing — caller should keep the blob URL and set
 * hubAssetId later from the Frame webhook.
 */
export async function uploadFrameAsset(input: {
  name: string;
  sourceUrl: string;
  accountId?: string;
  folderId?: string;
}): Promise<FrameAssetMeta | null> {
  const headers = await authHeaders();
  if (!headers) {
    logger.info("FRAME_IO_TOKEN missing — skip Frame remote upload");
    return null;
  }

  const accountId = await resolveAccountId(input.accountId);
  const folderId = input.folderId ?? (await frameFolderId());
  if (!accountId || !folderId) {
    logger.info(
      "Frame.io account/folder unresolved — skip remote upload; hubAssetId later via webhook",
      { hasAccount: Boolean(accountId), hasFolder: Boolean(folderId) },
    );
    return null;
  }

  const res = await fetch(
    `${FRAME_API}/accounts/${accountId}/folders/${encodeURIComponent(folderId)}/files/remote_upload`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          name: input.name,
          source_url: input.sourceUrl,
        },
      }),
    },
  );

  if (!res.ok) {
    logger.warn("Frame.io remote upload failed", {
      status: res.status,
      name: input.name,
    });
    return null;
  }

  const body = (await res.json()) as {
    data?: Record<string, unknown>;
  };
  if (!body.data) return null;
  const id =
    typeof body.data.id === "string" ? body.data.id : input.name;
  return toAssetMeta(id, body.data);
}
