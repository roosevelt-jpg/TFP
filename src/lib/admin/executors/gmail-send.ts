import "server-only";

import { resolveSecret } from "@/lib/secrets/store";

export type GmailSendResult = {
  ok: boolean;
  verification: string;
  sentMessageId?: string;
};

type GmailMessageMeta = {
  id: string;
  threadId: string;
  payload?: { headers?: Array<{ name: string; value: string }> };
};

/**
 * Send a drafted Gmail reply via the Gmail API (OAuth refresh from GMAIL_* secrets).
 * Verification = sent message id when the API accepts the raw MIME.
 */
export async function executeGmailSend(input: {
  messageId: string;
  draftBody: string;
  threadId?: string;
}): Promise<GmailSendResult> {
  const clientId = await resolveSecret("GMAIL_CLIENT_ID");
  const clientSecret = await resolveSecret("GMAIL_CLIENT_SECRET");
  const refreshToken = await resolveSecret("GMAIL_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    return {
      ok: false,
      verification: "GMAIL_* secrets missing — reply not sent",
    };
  }

  const draftBody = input.draftBody.trim();
  if (!draftBody) {
    return { ok: false, verification: "Empty draftBody — reply not sent" };
  }

  let accessToken: string;
  try {
    accessToken = await refreshGmailAccessToken({
      clientId,
      clientSecret,
      refreshToken,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token refresh failed";
    return { ok: false, verification: `Gmail auth failed: ${reason}` };
  }

  const detailRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(input.messageId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Message-ID&metadataHeaders=References`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!detailRes.ok) {
    const body = await detailRes.text();
    return {
      ok: false,
      verification: `Gmail read failed before send: ${detailRes.status} ${body.slice(0, 200)}`,
    };
  }

  const detail = (await detailRes.json()) as GmailMessageMeta;
  const headers = detail.payload?.headers ?? [];
  const subject = headerValue(headers, "Subject") ?? "(no subject)";
  const from = headerValue(headers, "From") ?? "";
  const messageIdHeader = headerValue(headers, "Message-ID");
  const references = headerValue(headers, "References");
  const threadId = input.threadId ?? detail.threadId;

  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  const replyTo = from;
  if (!replyTo) {
    return {
      ok: false,
      verification: "Original From header missing — cannot reply",
    };
  }

  const mimeLines = [
    `To: ${replyTo}`,
    `Subject: ${replySubject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
  ];
  if (messageIdHeader) {
    mimeLines.push(`In-Reply-To: ${messageIdHeader}`);
    mimeLines.push(
      `References: ${references ? `${references} ${messageIdHeader}` : messageIdHeader}`,
    );
  }
  mimeLines.push("", draftBody);

  const raw = Buffer.from(mimeLines.join("\r\n"), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sendRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw, threadId }),
    },
  );
  const sendJson = (await sendRes.json()) as {
    id?: string;
    threadId?: string;
    error?: { message?: string };
  };
  if (!sendRes.ok || !sendJson.id) {
    return {
      ok: false,
      verification: `Gmail send failed: ${sendJson.error?.message ?? sendRes.status}`,
    };
  }

  return {
    ok: true,
    sentMessageId: sendJson.id,
    verification: `Verified sent · gmail:${sendJson.id} · thread ${sendJson.threadId ?? threadId}`,
  };
}

function headerValue(
  headers: Array<{ name: string; value: string }>,
  name: string,
) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
    ?.value;
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
  if (!res.ok) throw new Error(`token refresh HTTP ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("no access_token in response");
  return json.access_token;
}
