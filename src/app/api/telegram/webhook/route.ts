import { NextResponse } from "next/server";

import { decideApproval, executeApprovedAction } from "@/lib/admin/approvals";
import { db } from "@/db";
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

export async function POST(request: Request) {
  const update = (await request.json()) as TelegramUpdate;
  const chatId = String(
    update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? "",
  );

  if (!chatId) return NextResponse.json({ ok: true });

  const access = isAllowedTelegramChat(chatId);
  if (!access.allowed) {
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
