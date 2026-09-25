import "server-only";

import { db } from "@/db";
import { executeGmailSend } from "@/lib/admin/executors/gmail-send";
import { executeMetaAdSetPause } from "@/lib/admin/executors/meta-pause";
import { publishPostCard } from "@/lib/content/publish";
import { executeApprovedQuoteBatch } from "@/lib/training/quote-batch";
import type { Prisma } from "@/generated/prisma/client";

export type DispatchResult = {
  ok: boolean;
  verification: string;
};

/**
 * Route an approved request to the correct executor and return verification text.
 */
export async function dispatchApprovedAction(
  approvalId: string,
): Promise<DispatchResult> {
  const row = await db.approvalRequest.findUniqueOrThrow({
    where: { id: approvalId },
  });
  const objectIds = (row.objectIds ?? {}) as Prisma.JsonObject;
  const afterState = (row.afterState ?? {}) as Prisma.JsonObject;

  if (
    typeof objectIds.quoteBatchId === "string" ||
    objectIds.kind === "quotes"
  ) {
    return executeApprovedQuoteBatch(row);
  }

  if (typeof objectIds.postCardId === "string") {
    const published = await publishPostCard(objectIds.postCardId);
    return {
      ok: true,
      verification: `Content scheduled · ${published.postUrl ?? objectIds.postCardId}`,
    };
  }

  if (typeof objectIds.adSetId === "string") {
    const result = await executeMetaAdSetPause(String(objectIds.adSetId));
    return {
      ok: result.ok,
      verification: result.verification,
    };
  }

  const messageId =
    typeof objectIds.messageId === "string" ? objectIds.messageId : null;
  const threadId =
    typeof objectIds.threadId === "string" ? objectIds.threadId : undefined;
  const draftBody =
    typeof objectIds.draftBody === "string"
      ? objectIds.draftBody
      : typeof afterState.draftBody === "string"
        ? afterState.draftBody
        : null;

  if (messageId && draftBody) {
    const result = await executeGmailSend({
      messageId,
      draftBody,
      threadId,
    });
    return {
      ok: result.ok,
      verification: result.verification,
    };
  }

  if (threadId && draftBody) {
    return {
      ok: false,
      verification:
        "Gmail send needs messageId with draftBody (threadId alone is not enough)",
    };
  }

  return {
    ok: false,
    verification:
      "No executor matched this approval payload (expected adSetId, postCardId, quoteBatchId, or messageId+draftBody)",
  };
}
