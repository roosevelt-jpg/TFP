import { NextResponse } from "next/server";

import { decideApproval, executeApprovedAction } from "@/lib/admin/approvals";
import { db } from "@/db";
import { env } from "@/env";
import { persistLeahFinanceCsv } from "@/lib/finance/persist-leah-csv";
import {
  linkChannelIdentity,
  recordFunnelEvent,
} from "@/lib/funnel/records";
import { parseTelegramActivationToken } from "@/lib/telegram/activation";
import {
  downloadTelegramFileText,
  isAllowedTelegramChat,
  sendTelegramMessage,
} from "@/lib/telegram/client";

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    text?: string;
    document?: {
      file_id: string;
      file_name?: string;
      mime_type?: string;
    };
    from?: { id: number; username?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number } };
  };
};

function looksLikeCsv(doc: {
  file_name?: string;
  mime_type?: string;
}): boolean {
  const name = (doc.file_name ?? "").toLowerCase();
  const mime = (doc.mime_type ?? "").toLowerCase();
  return (
    name.endsWith(".csv") ||
    mime.includes("csv") ||
    mime === "text/plain" ||
    mime === "application/vnd.ms-excel"
  );
}

async function handleLeahFinanceDocument(
  chatId: string,
  doc: { file_id: string; file_name?: string; mime_type?: string },
) {
  if (!looksLikeCsv(doc)) {
    await sendTelegramMessage({
      chatId,
      text:
        "Got the file, but it doesn’t look like a CSV. Send Leah’s daily finance template as `.csv` (Appendix A columns), or upload on /admin/money.",
    });
    return;
  }

  const downloaded = await downloadTelegramFileText(doc.file_id);
  if (!downloaded.ok) {
    await sendTelegramMessage({
      chatId,
      text: `Couldn’t download that file (${downloaded.reason}). Try again or upload on /admin/money.`,
    });
    return;
  }

  const result = await persistLeahFinanceCsv({
    csv: downloaded.text,
    actor: `telegram:leah:${chatId}`,
  });

  if (!result.ok) {
    const sample = result.errors
      .slice(0, 5)
      .map((e) => `row ${e.row}: ${e.reason}`)
      .join("\n");
    await sendTelegramMessage({
      chatId,
      text: `CSV rejected — ${result.errors.length} error(s).\n${sample}`,
    });
    return;
  }

  const flagNote =
    result.flags.length > 0
      ? `\nFlags: ${result.flags.slice(0, 3).join("; ")}`
      : "";
  await sendTelegramMessage({
    chatId,
    text: [
      "<b>Finance CSV ingested</b>",
      `Rows: ${result.rows}`,
      `Dues created: ${result.duesCreated}`,
      `Payouts matched: ${result.payoutsReconciled}`,
      `Batch: ${result.batchId}`,
      flagNote,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

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
    try {
      await decideApproval({
        id,
        decision: "approved",
        actor: `telegram:${chatId}`,
      });
      const executed = await executeApprovedAction({
        id,
        actor: `telegram:${chatId}`,
      });
      await sendTelegramMessage({
        chatId,
        text: `Approved ✓\n${executed.verificationResult ?? "Executed"}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approve failed";
      await sendTelegramMessage({
        chatId,
        text: `Approve failed: ${message}`,
      });
    }
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
    await handleLeahFinanceDocument(chatId, update.message.document);
    return NextResponse.json({ ok: true, finance: true });
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
