import "server-only";

import { get, put } from "@vercel/blob";

import { env } from "@/env";

// The client's file, never served directly. Versioned by pathname so a revision
// is uploaded alongside rather than over the top, and copies already delivered
// stay reproducible.
const MASTER_PATH = "programme-master.pdf";

const store = () => ({
  access: "private" as const,
  storeId: env.FORMULA_BLOB_STORE_ID,
  token: env.BLOB_READ_WRITE_TOKEN,
});

export async function readMasterPdf(): Promise<Uint8Array | null> {
  const result = await get(MASTER_PATH, store());
  if (!result) return null;

  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

// Keyed on the purchase reference, so a redrive overwrites the same copy rather
// than accumulating one per attempt.
export function purchasePdfPath(orderRef: string): string {
  return `purchases/${orderRef}.pdf`;
}

export async function writePurchasePdf(
  orderRef: string,
  bytes: Uint8Array,
): Promise<string> {
  const blob = await put(purchasePdfPath(orderRef), Buffer.from(bytes), {
    ...store(),
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.pathname;
}

export async function readPurchasePdf(
  orderRef: string,
): Promise<ReadableStream | null> {
  const result = await get(purchasePdfPath(orderRef), store());
  return result?.stream ?? null;
}
