import "server-only";

import { db } from "@/db";
import { createApprovalRequest } from "@/lib/admin/approvals";
import { ContentState } from "@/lib/content/states";
import { runSpecialistCheck } from "@/lib/cto/specialist";
import { resolveSecret } from "@/lib/secrets/store";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import type { ApprovalRequest, Prisma } from "@/generated/prisma/client";

const BANNED =
  /\b(secret|miracle|hack|trick|literally|honestly)\b|[!—–]|testosterone|trt|hormone|transform(ation|ed)|shredded|get.?ripped/i;

export type QuoteBatchDraft = {
  batchId: string;
  weekStarting: string;
  quotes: string[];
  draftText: string;
};

/** Starter quotes — used when GEMINI_API_KEY is unset or generation fails. */
const STARTER_QUOTES = [
  "Show up when it is quiet. That is where consistency is built.",
  "Train the plan in front of you. Not the one you wish you had.",
  "Discipline is repeating the boring work until it is not boring.",
  "Your standards matter more on the days motivation is low.",
  "Progress is a receipt. Keep collecting them.",
  "Protect the session. Everything else can wait forty minutes.",
  "Finish the week stronger than you started it.",
];

function nextMondayIso(from = new Date()): string {
  const d = new Date(from);
  const day = d.getUTCDay();
  const add = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

function validateQuote(q: string): string | null {
  if (q.includes("!") || q.includes("—") || q.includes("–")) {
    return "No exclamation marks or em-dashes";
  }
  if (BANNED.test(q)) {
    return "Banned word or health/body-transformation claim";
  }
  return null;
}

async function generateQuotesWithGemini(): Promise<string[] | null> {
  const apiKey = await resolveSecret("GEMINI_API_KEY");
  if (!apiKey) return null;

  const model =
    (await resolveSecret("GEMINI_MODEL")) ?? "gemini-2.5-flash";
  const prompt = `Generate exactly 7 short motivation quotes for a training WhatsApp group for The Formula Performance.
Voice: disciplined, confident, no hype.
Hard rules: no health or body-transformation claims; no banned words (secret, miracle, hack, trick, literally, honestly); no exclamation marks; no em-dashes or en-dashes; no testosterone/TRT/hormone claims.
Each quote: one sentence, under 120 characters.
Return ONLY a JSON array of 7 strings.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 800,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) return null;
    const quotes = parsed
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 7);
    return quotes.length >= 7 ? quotes : null;
  } catch {
    return null;
  }
}

/**
 * Part 03 §4 — Sunday quote batch for Kane approval.
 * Draft only: does **not** send to WhatsApp / GHL.
 * Uses Gemini when GEMINI_API_KEY is set; otherwise starter quotes.
 */
export async function buildSundayQuoteBatchDraft(opts?: {
  weekStarting?: string;
  quotes?: string[];
}): Promise<QuoteBatchDraft> {
  const weekStarting = opts?.weekStarting ?? nextMondayIso();
  const batchId = `QB-${weekStarting}`;

  let source: "provided" | "gemini" | "starter" = "provided";
  let quotes = opts?.quotes?.slice(0, 7);
  if (!quotes?.length) {
    const generated = await generateQuotesWithGemini();
    if (generated) {
      quotes = generated;
      source = "gemini";
    } else {
      quotes = STARTER_QUOTES.slice(0, 7);
      source = "starter";
    }
  }

  const issues: string[] = [];
  for (let i = 0; i < quotes.length; i++) {
    const err = validateQuote(quotes[i]!);
    if (err) issues.push(`Q${i + 1}: ${err}`);
  }

  const draftText = [
    `<b>Motivation quote batch</b> · ${batchId}`,
    "Week of posts to the training WhatsApp group (draft only — not sent).",
    "Edit or strike any line, then Approve the batch.",
    "",
    ...quotes.map((q, i) => `${i + 1}. ${q}`),
    "",
    issues.length
      ? `Validation flags:\n${issues.map((x) => `· ${x}`).join("\n")}`
      : `Validation: voice rules OK (${source} set).`,
    "",
    "Send path (GHL / Indigo) is not wired. Approving stores the draft only.",
  ].join("\n");

  await db.auditLog.create({
    data: {
      actor: "training.quote-batch",
      action: "training.quote_batch.draft",
      meta: { batchId, weekStarting, count: quotes.length, issues, source },
    },
  });

  return { batchId, weekStarting, quotes, draftText };
}

/** Cron entry: draft + Telegram Kane for approval. No WhatsApp send. */
export async function deliverSundayQuoteBatchForApproval() {
  const draft = await buildSundayQuoteBatchDraft();

  const check = await runSpecialistCheck({
    action: `Approve motivation quote batch ${draft.batchId}`,
    objectIds: {
      kind: "quotes",
      quoteBatchId: draft.batchId,
    },
    domain: "content",
    afterState: {
      weekStarting: draft.weekStarting,
      quotes: draft.quotes,
    },
  });

  if (!check.ok) {
    await db.auditLog.create({
      data: {
        actor: "training.quote-batch",
        action: "training.quote_batch.blocked",
        meta: {
          batchId: draft.batchId,
          reason: check.blockedReason ?? check.verdict,
        },
      },
    });
    return { ...draft, approvalId: null as string | null, blocked: true as const };
  }

  const approval = await createApprovalRequest({
    action: `Motivation quote batch ${draft.batchId}`,
    objectIds: {
      kind: "quotes",
      quoteBatchId: draft.batchId,
      weekStarting: draft.weekStarting,
    },
    afterState: {
      weekStarting: draft.weekStarting,
      quotes: draft.quotes,
      status: "pending_approval",
    },
    reach: "7 WhatsApp group posts (GHL/Indigo)",
    reversible: true,
    specialistVerdict: check.verdict,
    createdBy: "training.quote-batch",
  });

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: draft.draftText,
      replyMarkup: {
        inline_keyboard: [
          [
            { text: "Approve", callback_data: `approve:${approval.id}` },
            { text: "Reject", callback_data: `reject:${approval.id}` },
          ],
        ],
      },
    });
  }

  return { ...draft, approvalId: approval.id, blocked: false as const };
}

/**
 * On approve/execute: mark schedule, store quotes (PostCard + afterState).
 * WhatsApp/GHL send is not fully wired — queue verification only.
 */
export async function executeApprovedQuoteBatch(
  approval: ApprovalRequest,
): Promise<{ ok: boolean; verification: string }> {
  const objectIds = (approval.objectIds ?? {}) as Prisma.JsonObject;
  const afterState = (approval.afterState ?? {}) as Prisma.JsonObject;

  const quoteBatchId =
    typeof objectIds.quoteBatchId === "string"
      ? objectIds.quoteBatchId
      : `QB-${new Date().toISOString().slice(0, 10)}`;

  const weekStarting =
    typeof objectIds.weekStarting === "string"
      ? objectIds.weekStarting
      : typeof afterState.weekStarting === "string"
        ? afterState.weekStarting
        : nextMondayIso();

  const quotesRaw = afterState.quotes;
  const quotes = Array.isArray(quotesRaw)
    ? quotesRaw.filter((q): q is string => typeof q === "string")
    : [];

  const scheduledAt = new Date(`${weekStarting}T08:00:00.000Z`);

  const asset = await db.contentAsset.create({
    data: {
      uploader: "training.quote-batch",
      title: `Motivation quotes ${quoteBatchId}`,
      state: ContentState.scheduled,
      brief: quotes.join("\n"),
      filmingDay: scheduledAt,
    },
  });

  const postCard = await db.postCard.create({
    data: {
      assetId: asset.id,
      platform: "whatsapp",
      account: "training-group",
      caption: quotes.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      scheduledAt,
      compliancePass: true,
      complianceResult: "quote_batch_voice_rules",
      approvalId: approval.id,
      status: ContentState.scheduled,
    },
  });

  const storedAfter: Prisma.InputJsonValue = {
    ...afterState,
    weekStarting,
    quotes,
    status: "queued_indigo_ghl",
    postCardId: postCard.id,
    contentAssetId: asset.id,
    queuedAt: new Date().toISOString(),
  };

  await db.approvalRequest.update({
    where: { id: approval.id },
    data: { afterState: storedAfter },
  });

  await db.auditLog.create({
    data: {
      actor: "training.quote-batch",
      action: "training.quote_batch.queued",
      entityType: "ApprovalRequest",
      entityId: approval.id,
      meta: {
        quoteBatchId,
        weekStarting,
        postCardId: postCard.id,
        count: quotes.length,
      },
    },
  });

  return {
    ok: true,
    verification: "Queued for Indigo/GHL send — draft stored",
  };
}
