import "server-only";

import { db } from "@/db";
import { PurchaseStatus } from "@/generated/prisma/client";

// The token is the whole credential, so this is deliberately not cached: a
// cache would keep a revoked purchase resolving until its entry expired, which
// is an authorisation decision with a stale TTL. The lookup is a unique btree
// hit, so there is nothing to gain either.
export type ProgrammeAccess = {
  ref: string;
  ready: boolean;
};

// pdfToken is 32 random bytes, base64url. Anything of another shape cannot be
// one of ours, so it never reaches the database.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function findPurchaseByPdfToken(
  token: string,
): Promise<ProgrammeAccess | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const purchase = await db.purchase.findUnique({
    where: { pdfToken: token },
    select: { ref: true, status: true, pdfReadyAt: true },
  });

  // A refunded purchase stops resolving. The client's stated policy is that
  // access survives a refund, so revisit this if that is confirmed; until then
  // the tighter default is the safer one.
  if (purchase?.status !== PurchaseStatus.paid) return null;

  return { ref: purchase.ref, ready: purchase.pdfReadyAt !== null };
}
