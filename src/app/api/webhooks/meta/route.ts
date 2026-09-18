import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/db";
import { env } from "@/env";
import {
  linkChannelIdentity,
  logOutboundMessage,
  recordFunnelEvent,
} from "@/lib/funnel/records";
import { withdrawConsent } from "@/lib/funnel/eligibility";
import { scanAndEscalateSafety } from "@/lib/funnel/safety";
import { logger } from "@/lib/logger";
import { sendWhatsAppText } from "@/lib/whatsapp/client";
import {
  isWhatsAppConfigured,
  whatsappWorkflowsEnabled,
} from "@/lib/whatsapp/config";
import { isWhatsAppOptOutText } from "@/lib/whatsapp/templates";
import { isInsideWhatsAppServiceWindow } from "@/lib/whatsapp/window";
import { sendInstagramTemplate } from "@/lib/instagram/client";
import { POLICY_VERSION } from "@/lib/waitlist/consent";

function instagramInboundEnabled() {
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

/** Meta webhook verification challenge (shared IG + WhatsApp). */
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

type IgMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
};

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ title?: string; message?: string }>;
};

type WaChangeValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: WaMessage[];
  statuses?: WaStatus[];
};

/**
 * Instagram / Messenger + WhatsApp Cloud inbound on one Meta app webhook.
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
      messaging?: IgMessagingEvent[];
      changes?: Array<{ field?: string; value?: WaChangeValue }>;
    }>;
  };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (body.object === "whatsapp_business_account") {
    await handleWhatsAppEntries(body.entry ?? []);
    return NextResponse.json({ ok: true });
  }

  if (!instagramInboundEnabled()) {
    return NextResponse.json({ ok: true, ignored: "ig_flag_off" });
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      await handleInstagramMessage(event);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleInstagramMessage(event: IgMessagingEvent) {
  const senderId = event.sender?.id;
  const text = event.message?.text;
  if (!senderId || !text) return;

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
    const ack = await sendInstagramTemplate({
      recipientId: senderId,
      templateKey: "ig_inbound_ack",
    });
    if (!ack.ok) {
      logger.warn("Instagram auto-ack failed", {
        reason: ack.reason,
        detail: ack.detail,
      });
    } else if (ack.messageId) {
      await logOutboundMessage({
        channel: "instagram",
        templateId: "ig_inbound_ack",
        providerMessageId: ack.messageId,
        status: "sent",
      });
    }
  }
}

async function handleWhatsAppEntries(
  entries: Array<{
    id?: string;
    changes?: Array<{ field?: string; value?: WaChangeValue }>;
  }>,
) {
  if (!whatsappWorkflowsEnabled()) return;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const status of value.statuses ?? []) {
        await applyWhatsAppStatus(status);
      }

      for (const message of value.messages ?? []) {
        await handleWhatsAppInbound(message, value);
      }
    }
  }
}

async function applyWhatsAppStatus(status: WaStatus) {
  if (!status.id || !status.status) return;
  const mapped =
    status.status === "delivered"
      ? "delivered"
      : status.status === "read"
        ? "read"
        : status.status === "failed"
          ? "failed"
          : status.status === "sent"
            ? "sent"
            : null;
  if (!mapped) return;

  await db.outboundMessage.updateMany({
    where: { providerMessageId: status.id, channel: "whatsapp" },
    data: {
      status: mapped,
      failureReason:
        mapped === "failed"
          ? status.errors?.[0]?.title ?? status.errors?.[0]?.message ?? "failed"
          : null,
      ...(mapped === "sent" || mapped === "delivered" || mapped === "read"
        ? { sentAt: new Date() }
        : {}),
    },
  });
}

async function handleWhatsAppInbound(message: WaMessage, value: WaChangeValue) {
  const from = message.from;
  const text = message.text?.body ?? "";
  if (!from) return;

  const contactName =
    value.contacts?.find((c) => c.wa_id === from)?.profile?.name ?? "WhatsApp";

  const customer = await db.customer.findFirst({
    where: {
      OR: [
        { whatsapp: { contains: from } },
        { whatsapp: from },
      ],
    },
    select: { id: true, waitlistId: true, email: true, name: true },
  });

  const waitlist =
    customer?.waitlistId
      ? null
      : await db.waitlist.findFirst({
          where: { whatsapp: { contains: from } },
          select: { id: true },
        });

  await linkChannelIdentity({
    channel: "whatsapp",
    externalUserId: from,
    customerId: customer?.id,
    waitlistId: customer?.waitlistId ?? waitlist?.id,
    address: from,
    inbound: true,
  });

  await db.leadThread.upsert({
    where: {
      channel_externalId: {
        channel: "whatsapp",
        externalId: from,
      },
    },
    create: {
      channel: "whatsapp",
      externalId: from,
      contactName,
      snippet: text.slice(0, 280) || "(non-text message)",
      lastInboundAt: new Date(
        Number(message.timestamp ? `${message.timestamp}000` : Date.now()),
      ),
      highIntent: Boolean(customer),
    },
    update: {
      contactName,
      snippet: text.slice(0, 280) || "(non-text message)",
      lastInboundAt: new Date(
        Number(message.timestamp ? `${message.timestamp}000` : Date.now()),
      ),
      highIntent: Boolean(customer),
    },
  });

  const thread = await db.leadThread.findUnique({
    where: {
      channel_externalId: { channel: "whatsapp", externalId: from },
    },
  });

  if (text && isWhatsAppOptOutText(text)) {
    await withdrawConsent({
      customerId: customer?.id,
      waitlistId: customer?.waitlistId ?? waitlist?.id,
      channel: "whatsapp",
      source: "whatsapp_inbound_stop",
      policyVersion: POLICY_VERSION,
    });
  }

  const safety = text
    ? await scanAndEscalateSafety({
        text,
        source: "whatsapp",
        threadId: thread?.id,
        contactLabel: contactName,
      })
    : { paused: false };

  await recordFunnelEvent({
    eventName: "whatsapp_inbound",
    customerId: customer?.id,
    waitlistId: customer?.waitlistId ?? waitlist?.id,
    source: "meta",
    properties: {
      from,
      wamid: message.id,
      preview: text.slice(0, 80),
      safetyPaused: safety.paused,
    },
    eventId: message.id ?? `wa:${from}:${message.timestamp}`,
  });

  if (customer) {
    await recordFunnelEvent({
      eventName: "programme_activated",
      customerId: customer.id,
      source: "meta",
      properties: { channel: "whatsapp", from },
      eventId: `programme-activated:wa:${customer.id}`,
    });
  }

  if (
    text &&
    !safety.paused &&
    (await isWhatsAppConfigured()) &&
    (await isInsideWhatsAppServiceWindow(from))
  ) {
    const first = customer?.name?.split(/\s+/)[0] ?? "there";
    const ack = await sendWhatsAppText({
      toE164: from,
      text: customer
        ? `Got you, ${first} — your Formula coach is on it. Keep messaging here for daily accountability.`
        : "Thanks for messaging The Formula Programme. If you’ve joined the waitlist or purchased, reply with the email you used and we’ll link your chat.",
    });
    if (ack.ok) {
      await logOutboundMessage({
        customerId: customer?.id,
        waitlistId: customer?.waitlistId ?? waitlist?.id,
        channel: "whatsapp",
        templateId: "inbound_auto_ack",
        providerMessageId: ack.messageId,
        status: "sent",
      });
    }
  }
}
