import "server-only";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";

function esc(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Dubai calendar day bounds as UTC instants (GST, UTC+4). */
function dubaiDayBounds(offsetDays = 0, now = new Date()) {
  const dubaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(now);
  const [y, m, d] = dubaiDate.split("-").map(Number);
  const startMs =
    Date.UTC(y!, m! - 1, d! + offsetDays, 0, 0, 0) - 4 * 3600_000;
  const start = new Date(startMs);
  const end = new Date(startMs + 24 * 3600_000);
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dubai",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(start);
  return { start, end, label };
}

export type TomorrowPostsDigestResult = {
  count: number;
  text: string;
  sent: boolean;
};

/**
 * CT12 — tomorrow's approved / scheduled posts digest (Part 03 §2.13).
 * Each line includes a [Hold] note; Hold callbacks stay on /admin/content for now.
 */
export async function buildTomorrowPostsDigest(
  now = new Date(),
): Promise<TomorrowPostsDigestResult> {
  const { start, end, label } = dubaiDayBounds(1, now);

  const posts = await db.postCard.findMany({
    where: {
      status: {
        in: [
          ContentState.scheduled,
          "scheduled",
          ContentState.awaitingKane,
          "awaiting_kane",
          ContentState.ready,
          "ready",
        ],
      },
      scheduledAt: { gte: start, lt: end },
    },
    include: { asset: { select: { title: true, brief: true } } },
    orderBy: { scheduledAt: "asc" },
    take: 40,
  });

  const lines: string[] = [
    `<b>CT12 · TOMORROW'S POSTS</b> | ${esc(label)} Dubai`,
    `${posts.length} approved / scheduled`,
    "",
  ];

  if (posts.length === 0) {
    lines.push("— none scheduled");
  } else {
    for (const post of posts) {
      const t = post.scheduledAt
        ? post.scheduledAt.toLocaleTimeString("en-GB", {
            timeZone: "Asia/Dubai",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "—:—";
      const note =
        post.asset.brief?.trim().slice(0, 60) ||
        post.caption?.trim().slice(0, 60) ||
        post.status;
      lines.push(
        `• ${esc(t)} · ${esc(post.platform)}/${esc(post.account)} · ${esc(post.asset.title)}`,
      );
      lines.push(`  note: ${esc(note)} · <b>[Hold]</b>`);
    }
  }

  lines.push(
    "",
    "Tap Hold on /admin/content to pause a slot before publish.",
  );

  return {
    count: posts.length,
    text: lines.join("\n"),
    sent: false,
  };
}

/** Send CT12 digest to Kane. */
export async function sendTomorrowPostsDigest(
  now = new Date(),
): Promise<TomorrowPostsDigestResult> {
  const digest = await buildTomorrowPostsDigest(now);

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: digest.text,
    });
  }

  await db.auditLog.create({
    data: {
      actor: "content.tomorrow-digest",
      action: "content.ct12_tomorrow_posts",
      meta: { count: digest.count, sent: Boolean(kaneChatId) },
    },
  });

  return { ...digest, sent: Boolean(kaneChatId) };
}
