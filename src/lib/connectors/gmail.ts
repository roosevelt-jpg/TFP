import "server-only";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import { resolveSecret } from "@/lib/secrets/store";

type GmailPart = {
  mimeType?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: Array<{ name: string; value: string }>;
};

type GmailMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: GmailPart;
};

const IMPORTANT_SENDER_RE =
  /\b(stripe|shopify|meta|facebook|klaviyo|google|revolut|hmrc|companies house|fulfilfulfil|multichannel|fulfil.?ment|affiliate)\b/i;
const IMPORTANT_URGENT_RE =
  /\b(payment failed|suspension|suspend|legal|deadline|chargeback|dispute)\b/i;
const NEEDS_KANE_RE =
  /\b(kane|please reply|needs? (your|kane)|for kane|kane'?s (input|decision|reply))\b/i;
const HEALTH_RE =
  /side effect|adverse|reaction|hospital|allergic/i;

/**
 * Gmail triage — read + draft only. Sending is gated by Kane approval.
 * Fetches full message body for E1/E2 keyword classification and snippet storage.
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
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!detailRes.ok) continue;
    const detail = (await detailRes.json()) as GmailMessage;
    const subject =
      detail.payload?.headers?.find((h) => h.name.toLowerCase() === "subject")
        ?.value ?? "(no subject)";
    const from =
      detail.payload?.headers?.find((h) => h.name.toLowerCase() === "from")
        ?.value ?? "";
    const bodyText = extractPlainText(detail.payload);
    const snippet = (bodyText || detail.snippet || "").slice(0, 280);
    const classifyBlob = `${from} ${subject} ${bodyText}`;

    await db.leadThread.upsert({
      where: {
        channel_externalId: {
          channel: "email",
          externalId: detail.threadId,
        },
      },
      create: {
        channel: "email",
        externalId: detail.threadId,
        contactName: from.slice(0, 200) || null,
        snippet,
        lastInboundAt: new Date(),
        highIntent: IMPORTANT_SENDER_RE.test(classifyBlob),
        label: "verified",
        sourceFreshAt: new Date(),
      },
      update: {
        contactName: from.slice(0, 200) || undefined,
        snippet,
        lastInboundAt: new Date(),
        highIntent: IMPORTANT_SENDER_RE.test(classifyBlob),
        sourceFreshAt: new Date(),
      },
    });

    // Health / adverse-reaction → P1, no draft on the substance.
    if (HEALTH_RE.test(classifyBlob)) {
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

    // E1 — important sender keywords on full body
    if (IMPORTANT_SENDER_RE.test(classifyBlob)) {
      const urgent = IMPORTANT_URGENT_RE.test(classifyBlob);
      const threadKey = `E1-${detail.threadId}`;
      const existing = await db.alert.findFirst({
        where: { threadKey, status: { in: ["open", "acknowledged"] } },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            ruleId: "E1",
            severity: urgent ? "p1" : "p2",
            title: `Important sender email: ${subject}`,
            payload: { messageId: detail.id, from, snippet },
            threadKey,
          },
        });
      }
    }

    // E2 — needs Kane reply (still draft + specialist + approval)
    const needsKane = NEEDS_KANE_RE.test(classifyBlob);
    if (needsKane) {
      const threadKey = `E2-${detail.threadId}`;
      const existing = await db.alert.findFirst({
        where: { threadKey, status: { in: ["open", "acknowledged"] } },
      });
      if (!existing) {
        await db.alert.create({
          data: {
            ruleId: "E2",
            severity: "p2",
            title: `Needs Kane reply: ${subject}`,
            payload: { messageId: detail.id, from, snippet },
            threadKey,
          },
        });
      }
    }

    const draftBody = [
      `Thanks for your email.`,
      ``,
      `We've received it and will come back shortly.`,
      ``,
      `— The Formula Performance`,
    ].join("\n");

    const check = await runSpecialistCheck({
      action: `Send drafted Gmail reply: ${subject}`,
      objectIds: { messageId: detail.id, threadId: detail.threadId },
      domain: "gmail",
      afterState: { draftBody, snippet, e1: IMPORTANT_SENDER_RE.test(classifyBlob), e2: needsKane },
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

function extractPlainText(payload?: GmailPart): string {
  if (!payload) return "";
  const chunks: string[] = [];
  walkParts(payload, chunks);
  return chunks.join("\n").replace(/\s+/g, " ").trim();
}

function walkParts(part: GmailPart, out: string[]) {
  const mime = (part.mimeType ?? "").toLowerCase();
  if (mime === "text/plain" && part.body?.data) {
    out.push(decodeBase64Url(part.body.data));
  } else if (mime === "text/html" && part.body?.data && out.length === 0) {
    out.push(stripHtml(decodeBase64Url(part.body.data)));
  }
  for (const child of part.parts ?? []) {
    walkParts(child, out);
  }
  // Single-part message with body at the root
  if (!part.parts?.length && part.body?.data && !mime.startsWith("multipart/")) {
    if (mime.includes("html")) {
      if (out.length === 0) out.push(stripHtml(decodeBase64Url(part.body.data)));
    } else if (out.length === 0) {
      out.push(decodeBase64Url(part.body.data));
    }
  }
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');
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
