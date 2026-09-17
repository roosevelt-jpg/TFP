import "server-only";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import { resolveSecret } from "@/lib/secrets/store";

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: { headers?: Array<{ name: string; value: string }> };
};

/**
 * Gmail triage — read + draft only. Sending is gated by Kane approval.
 */
export async function triageGmailInbox() {
  const clientId = await resolveSecret("GMAIL_CLIENT_ID");
  const clientSecret = await resolveSecret("GMAIL_CLIENT_SECRET");
  const refreshToken = await resolveSecret("GMAIL_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    await db.connectorRun.update({
      where: { sourceId: "S7" },
      data: {
        lastRunAt: new Date(),
        lastError: "GMAIL_* not configured",
        status: "error",
      },
    });
    return { skipped: true as const };
  }

  const token = await refreshGmailAccessToken({
    clientId,
    clientSecret,
    refreshToken,
  });
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:2d&maxResults=20",
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!listRes.ok) {
    await db.connectorRun.update({
      where: { sourceId: "S7" },
      data: {
        lastRunAt: new Date(),
        lastError: `list ${listRes.status}`,
        status: "error",
      },
    });
    return { ok: false as const };
  }

  const list = (await listRes.json()) as { messages?: Array<{ id: string }> };
  let drafted = 0;

  for (const msg of list.messages ?? []) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!detailRes.ok) continue;
    const detail = (await detailRes.json()) as GmailMessage;
    const subject =
      detail.payload?.headers?.find((h) => h.name === "Subject")?.value ??
      "(no subject)";
    const from =
      detail.payload?.headers?.find((h) => h.name === "From")?.value ?? "";
    const snippet = detail.snippet ?? "";

    // Health / adverse-reaction → P1, no draft on the substance.
    if (/side effect|adverse|reaction|hospital|allergic/i.test(snippet + subject)) {
      const threadKey = `GMAIL-C2-${detail.threadId}`;
      const existing = await db.alert.findFirst({
        where: { threadKey, status: { in: ["open", "acknowledged"] } },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            ruleId: "C2",
            severity: "p1",
            title: `Health mention in email: ${subject}`,
            payload: { messageId: detail.id, from },
            threadKey,
          },
        });
      }
      continue;
    }

    const draftBody = [
      `Thanks for your email.`,
      ``,
      `We've received it and will come back shortly.`,
      ``,
      `— The Formula Performance`,
    ].join("\n");

    const check = runSpecialistCheck({
      action: `Send drafted Gmail reply: ${subject}`,
      objectIds: { messageId: detail.id, threadId: detail.threadId },
      domain: "gmail",
      afterState: { draftBody },
    });

    if (!check.ok) continue;

    await createApprovalRequest({
      action: `Send drafted reply to ${from}: ${subject}`,
      objectIds: {
        messageId: detail.id,
        threadId: detail.threadId,
        draftBody,
      },
      reach: "1 external email",
      reversible: false,
      specialistVerdict: check.verdict,
      createdBy: "cto-agent",
    });
    drafted += 1;
  }

  await db.connectorRun.update({
    where: { sourceId: "S7" },
    data: {
      lastRunAt: new Date(),
      lastSuccessAt: new Date(),
      lastError: null,
      status: "healthy",
    },
  });

  return { drafted };
}

async function refreshGmailAccessToken(creds: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: creds.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
