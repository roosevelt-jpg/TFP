import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/db";
import { env } from "@/env";
import {
  linkChannelIdentity,
  recordFunnelEvent,
} from "@/lib/funnel/records";
import { scanAndEscalateSafety } from "@/lib/funnel/safety";
import { logger } from "@/lib/logger";

function inboundEnabled() {
  return (
    env.INSTAGRAM_INBOUND_ENABLED === true ||
    String(env.INSTAGRAM_INBOUND_ENABLED) === "true"
  );
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.slice("sha256=".length);
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex"),
    );
  } catch {
    return false;
  }
}

/** Meta webhook verification challenge. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
};

/**
 * Instagram / Messenger inbound. Upserts LeadThread for Growth inbox and
 * optionally auto-acks when INSTAGRAM_INBOUND_ENABLED.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (env.META_APP_SECRET && !verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: MessagingEvent[];
    }>;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (!inboundEnabled()) {
    return NextResponse.json({ ok: true, ignored: "flag_off" });
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const senderId = event.sender?.id;
      const text = event.message?.text;
      if (!senderId || !text) continue;

      await linkChannelIdentity({
        channel: "instagram",
        externalUserId: senderId,
        inbound: true,
      });

      await db.leadThread.upsert({
        where: {
          channel_externalId: {
            channel: "instagram",
            externalId: senderId,
          },
        },
        create: {
          channel: "instagram",
          externalId: senderId,
          contactName: "Instagram",
          snippet: text.slice(0, 280),
          lastInboundAt: new Date(event.timestamp ?? Date.now()),
          highIntent: false,
        },
        update: {
          snippet: text.slice(0, 280),
          lastInboundAt: new Date(event.timestamp ?? Date.now()),
        },
      });

      const thread = await db.leadThread.findUnique({
        where: {
          channel_externalId: {
            channel: "instagram",
            externalId: senderId,
          },
        },
      });

      const safety = await scanAndEscalateSafety({
        text,
        source: "instagram",
        threadId: thread?.id,
        contactLabel: senderId,
      });

      await recordFunnelEvent({
        eventName: "instagram_inbound",
        source: "meta",
        properties: {
          senderId,
          mid: event.message?.mid,
          preview: text.slice(0, 80),
          safetyPaused: safety.paused,
        },
        eventId: event.message?.mid ?? `ig:${senderId}:${event.timestamp}`,
      });

      const pageToken = env.META_PAGE_ACCESS_TOKEN;
      if (pageToken && !safety.paused) {
        try {
          await fetch(
            `https://graph.facebook.com/v21.0/me/messages?access_token=${pageToken}`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                recipient: { id: senderId },
                message: {
                  text: "Thanks — the Formula team has your message. For coaching, WhatsApp is fastest once you’re on the programme.",
                },
              }),
            },
          );
        } catch (error) {
          logger.warn("Instagram auto-ack failed", {
            message: error instanceof Error ? error.message : "failed",
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
