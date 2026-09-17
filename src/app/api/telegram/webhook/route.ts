import { NextResponse } from "next/server";

import { decideApproval, executeApprovedAction } from "@/lib/admin/approvals";
import { db } from "@/db";
import { env } from "@/env";
import {
  linkChannelIdentity,
  recordFunnelEvent,
} from "@/lib/funnel/records";
import { parseTelegramActivationToken } from "@/lib/telegram/activation";
import {
  isAllowedTelegramChat,
  sendTelegramMessage,
} from "@/lib/telegram/client";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    document?: { file_id: string; file_name?: string };
    from?: { id: number; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number } };
  };
};

async function handleCustomerStart(chatId: string, text: string) {
  const enabled =
    env.TELEGRAM_ACTIVATION_ENABLED === true ||
    String(env.TELEGRAM_ACTIVATION_ENABLED) === "true";
  if (!enabled) {
    await sendTelegramMessage({
      chatId,
      text: "Telegram activation isn’t enabled yet. Use WhatsApp from your success page.",
    });
    return;
  }

  const payload = text.replace(/^\/start\s*/i, "").trim();
  if (!payload) {
    await sendTelegramMessage({
      chatId,
      text: "Welcome to The Formula Programme. Open the activation link from your success page to connect this chat.",
    });
    return;
  }

  const customerId = parseTelegramActivationToken(payload);
  if (!customerId) {
    await sendTelegramMessage({
      chatId,
      text: "That activation link isn’t valid. Use the button from your programme success page.",
    });
    return;
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, email: true },
  });
  if (!customer) {
    await sendTelegramMessage({
      chatId,
      text: "We couldn’t find that membership. Talk to support if this keeps happening.",
    });
    return;
  }

  await linkChannelIdentity({
    channel: "telegram",
    externalUserId: chatId,
    customerId: customer.id,
    address: customer.email,
    inbound: true,
  });

  await recordFunnelEvent({
    eventName: "programme_activated",
    customerId: customer.id,
    source: "telegram",
    properties: { channel: "telegram", chatId },
    eventId: `activate:telegram:${customer.id}:${chatId}`,
  });

  const first = customer.name.split(" ")[0] ?? "athlete";
  await sendTelegramMessage({
    chatId,
    text: `You’re connected, ${first}. Daily accountability stays in WhatsApp — this chat is for programme alerts when we enable them.`,
  });
}

export async function POST(request: Request) {
  const update = (await request.json()) as TelegramUpdate;
  const chatId = String(
    update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? "",
  );

  if (!chatId) return NextResponse.json({ ok: true });

  const access = await isAllowedTelegramChat(chatId);

  if (!access.allowed) {
    const text = update.message?.text ?? "";
    if (text.startsWith("/start")) {
      await db.telegramMessageLog.create({
        data: {
          chatId,
          direction: "in",
          kind: "customer_start",
          payload: update as object,
        },
      });
      await handleCustomerStart(chatId, text);
      return NextResponse.json({ ok: true, customer: true });
    }

    await db.telegramMessageLog.create({
      data: {
        chatId,
        direction: "in",
        kind: "ignored_foreign_chat",
        payload: update as object,
      },
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  await db.telegramMessageLog.create({
    data: {
      chatId,
      direction: "in",
      kind: update.callback_query ? "callback" : "message",
      payload: update as object,
    },
  });

  if (update.callback_query?.data?.startsWith("approve:")) {
    if (access.role !== "kane") {
      return NextResponse.json({ ok: true });
    }
    const id = update.callback_query.data.slice("approve:".length);
    await decideApproval({
      id,
      decision: "approved",
      actor: `telegram:${chatId}`,
    });
    await executeApprovedAction({
      id,
      actor: `telegram:${chatId}`,
      verificationResult: "Telegram approval recorded; executor verify pending",
    });
    await sendTelegramMessage({
      chatId,
      text: `Approved ${id}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (update.callback_query?.data?.startsWith("reject:")) {
    if (access.role !== "kane") {
      return NextResponse.json({ ok: true });
    }
    const id = update.callback_query.data.slice("reject:".length);
    await decideApproval({
      id,
      decision: "rejected",
      actor: `telegram:${chatId}`,
    });
    await sendTelegramMessage({ chatId, text: `Rejected ${id}` });
    return NextResponse.json({ ok: true });
  }

  if (update.message?.document && access.role === "leah") {
    await sendTelegramMessage({
      chatId,
      text: "Finance file received. Upload it on /admin/money (CSV template) for validation in Phase 3 parser — Telegram file ingest stores the receipt.",
    });
    return NextResponse.json({ ok: true });
  }

  if (update.message?.text === "/status") {
    const open = await db.alert.count({ where: { status: "open" } });
    await sendTelegramMessage({
      chatId,
      text: `TFP Command online. Open alerts: ${open}.`,
    });
  }

  return NextResponse.json({ ok: true });
}
