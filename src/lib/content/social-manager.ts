import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/db";
import { ContentState } from "@/lib/content/states";
import {
  getKaneTelegramChatId,
  sendTelegramMessage,
} from "@/lib/telegram/client";
import { computeAffiliateScorecard } from "@/lib/scorecards/affiliates";

/** Monday of the current Dubai calendar week as a UTC Date @ midnight. */
export function dubaiWeekStartMonday(d = new Date()): Date {
  const dubaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(d);
  const [y, m, day] = dubaiDate.split("-").map(Number);
  const asUtc = new Date(Date.UTC(y!, m! - 1, day!));
  const dow = asUtc.getUTCDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  asUtc.setUTCDate(asUtc.getUTCDate() - back);
  return asUtc;
}

function dubaiDayBounds(offsetDays: number, from = new Date()) {
  const dubaiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
  }).format(from);
  const [y, m, day] = dubaiDate.split("-").map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, day! + offsetDays));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Dubai weekday: 0=Sun … 6=Sat */
function dubaiWeekday(d = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dubai",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

const KB_THEMES = [
  "talking-head",
  "product",
  "UGC",
  "training",
  "gym cue",
  "kitchen / meal prep",
  "WhatsApp coach demo",
  "week check-in",
] as const;

async function loadEditorKbThemes(): Promise<string[]> {
  try {
    const kbPath = path.join(process.cwd(), "docs", "editor-knowledge-base.md");
    const text = await readFile(kbPath, "utf8");
    const themes: string[] = [];
    // Examples section lists content types
    const exampleMatch = text.match(
      /talking-head|product|UGC|training|Reels|Shorts/gi,
    );
    if (exampleMatch) {
      for (const m of exampleMatch) {
        const n = m.toLowerCase();
        if (!themes.includes(n)) themes.push(n);
      }
    }
    for (const t of KB_THEMES) {
      if (!themes.some((x) => x.toLowerCase() === t.toLowerCase())) {
        themes.push(t);
      }
    }
    return themes.slice(0, 8);
  } catch {
    return [...KB_THEMES];
  }
}

function tagsAsThemes(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t)).filter(Boolean).slice(0, 4);
  }
  if (tags && typeof tags === "object") {
    return Object.values(tags as Record<string, unknown>)
      .map((v) => String(v))
      .filter(Boolean)
      .slice(0, 4);
  }
  return [];
}

/**
 * Locked edit brief from editor KB template + asset context (Part 07 §10/§12).
 * No hardcoded one-liner — fields filled from plan/card/KB themes.
 */
export function buildLockedEditBrief(input: {
  title: string;
  platform: string;
  account: string;
  themes: string[];
  briefId?: string;
  deadline?: string | null;
}): string {
  const theme = input.themes[0] ?? "talking-head";
  return [
    `BRIEF ID: ${input.briefId ?? "WPP-derived"}`,
    `Content type: ${theme}`,
    `Source asset: ${input.title}`,
    `Platforms: ${input.platform} / ${input.account}`,
    `Target length: per ${input.platform} format (KB §4)`,
    `Arc / shot order: derive from Weekly Posting Plan + asset tags (${input.themes.join(", ") || "KB default"})`,
    `VO / captions notes: captions burned · house caption style (KB §5)`,
    `Hook (first 1.5s): required`,
    `End card: TFP complete silver wordmark only`,
    `Compliance notes: no hormone / medical / out-of-register claims (KB §6)`,
    `Deadline: ${input.deadline ?? "per WPP slot"}`,
    `Reference examples: Frame.io Examples/ · ${theme}`,
  ].join("\n");
}

/**
 * CT6 — textual replacement post cards for calendar gaps (no create/publish).
 * Derived from WeeklyPostingPlan notes, pending cards, and editor KB themes.
 */
export async function proposeCt6ReplacementCards(gapDays: number): Promise<
  string[]
> {
  if (gapDays <= 0) return [];

  const weekStart = dubaiWeekStartMonday();
  const [plan, pending, themes] = await Promise.all([
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.postCard.findMany({
      where: {
        status: {
          in: [ContentState.awaitingKane, "awaiting_kane", ContentState.draft],
        },
      },
      include: { asset: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    loadEditorKbThemes(),
  ]);

  const planHints =
    plan?.notes
      ?.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("·") || /slot|platform|theme/i.test(l))
      .slice(0, 6) ?? [];

  const lines: string[] = [];
  for (let i = 0; i < gapDays; i++) {
    const card = pending[i % Math.max(pending.length, 1)];
    const theme = themes[i % themes.length]!;
    if (card) {
      const cardThemes = [
        ...tagsAsThemes(card.asset.tags),
        theme,
      ];
      lines.push(
        `· [CT6 proposal] ${card.platform}/${card.account} · ${card.asset.title} — theme ${theme} · from pending card + WPP`,
      );
      lines.push(
        `  brief:\n${buildLockedEditBrief({
          title: card.asset.title,
          platform: card.platform,
          account: card.account,
          themes: cardThemes,
          briefId: `CT6-${weekStart.toISOString().slice(0, 10)}-${i + 1}`,
        })
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")}`,
      );
    } else {
      const platform =
        i % 3 === 0 ? "instagram" : i % 3 === 1 ? "tiktok" : "youtube_shorts";
      lines.push(
        `· [CT6 proposal] ${platform}/@theformulaperformance · ${theme} fill — from WPP + editor KB theme`,
      );
      if (planHints[i]) {
        lines.push(`  WPP hint: ${planHints[i]}`);
      }
      lines.push(
        `  brief:\n${buildLockedEditBrief({
          title: `${theme} (gap fill)`,
          platform,
          account: "@theformulaperformance",
          themes: [theme],
          briefId: `CT6-${weekStart.toISOString().slice(0, 10)}-${i + 1}`,
        })
          .split("\n")
          .map((l) => `  ${l}`)
          .join("\n")}`,
      );
    }
  }
  return lines;
}

/**
 * Filming shot list for Wed/Sun — derived from WPP + pending + KB, not hardcoded.
 */
export async function buildFilmingShotList(filmingDate: Date): Promise<string> {
  const weekStart = dubaiWeekStartMonday(filmingDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const dayLabel = filmingDate.toISOString().slice(0, 10);

  const [plan, pending, themes, inPlanAssets] = await Promise.all([
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.postCard.findMany({
      where: {
        OR: [
          {
            status: {
              in: [
                ContentState.awaitingKane,
                "awaiting_kane",
                ContentState.draft,
                ContentState.inPlan,
              ],
            },
            scheduledAt: { gte: weekStart, lt: weekEnd },
          },
          {
            status: {
              in: [
                ContentState.awaitingKane,
                "awaiting_kane",
                ContentState.inPlan,
              ],
            },
            scheduledAt: null,
            updatedAt: { gte: weekStart },
          },
        ],
      },
      include: { asset: true },
      orderBy: { scheduledAt: "asc" },
      take: 12,
    }),
    loadEditorKbThemes(),
    db.contentAsset.findMany({
      where: {
        state: {
          in: [ContentState.inPlan, ContentState.briefLocked, ContentState.tagged],
        },
        OR: [{ filmingDay: filmingDate }, { filmingDay: null }],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const shots: string[] = [];
  let i = 0;
  for (const card of pending) {
    i += 1;
    const themesFor = [
      ...tagsAsThemes(card.asset.tags),
      themes[i % themes.length]!,
    ];
    shots.push(
      `${i}. ${card.platform}/${card.account} · ${card.asset.title} · themes: ${themesFor.join(", ")}`,
    );
  }
  for (const asset of inPlanAssets) {
    if (pending.some((c) => c.assetId === asset.id)) continue;
    i += 1;
    const themesFor = [...tagsAsThemes(asset.tags), themes[i % themes.length]!];
    shots.push(
      `${i}. Asset · ${asset.title} · themes: ${themesFor.join(", ")}`,
    );
  }
  if (shots.length === 0) {
    for (let n = 0; n < Math.min(4, themes.length); n++) {
      shots.push(
        `${n + 1}. ${themes[n]} · from editor KB (no pending cards / WPP slots yet)`,
      );
    }
  }

  return [
    `<b>Filming shot list</b> · ${dayLabel}`,
    `WPP: ${plan?.status ?? "none"} · week ${weekStart.toISOString().slice(0, 10)}`,
    "",
    ...shots,
    "",
    "<b>Locked brief rules</b> (KB §§2–6)",
    "Never re-frame talking-head · edit from Kane's cut · brief locked before render · captions + silver end card · no hormone claims",
  ].join("\n");
}

/**
 * Day-before filming reminder (S2) — Tuesday → Wed shoot, Saturday → Sun shoot.
 */
export async function sendFilmingDayReminder(now = new Date()) {
  const wd = dubaiWeekday(now);
  // Day before Wed (2) or Sun (0) → remind on Tue (2) or Sat (6)
  const isDayBeforeWed = wd === 2;
  const isDayBeforeSun = wd === 6;
  if (!isDayBeforeWed && !isDayBeforeSun) {
    return { sent: false as const, reason: "not filming eve" as const };
  }

  const filmingOffset = isDayBeforeWed ? 1 : 1;
  const { start: filmingDay } = dubaiDayBounds(filmingOffset, now);
  const shotList = await buildFilmingShotList(filmingDay);
  const label = isDayBeforeWed ? "Wednesday" : "Sunday";

  const text = [
    `<b>Filming tomorrow (${label})</b>`,
    "Protected block on Kane's to-do. Shot list derived from Weekly Posting Plan + pending cards + editor KB.",
    "",
    shotList,
  ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({ chatId: kaneChatId, text });
  }

  await db.auditLog.create({
    data: {
      actor: "social-media-manager",
      action: "content.filming_reminder",
      meta: {
        filmingDay: filmingDay.toISOString().slice(0, 10),
        label,
        sent: Boolean(kaneChatId),
      },
    },
  });

  return {
    sent: Boolean(kaneChatId),
    filmingDay: filmingDay.toISOString().slice(0, 10),
    label,
  };
}

/**
 * Social media manager agent — plans only. No publish tool.
 * Creates / refreshes this week's WeeklyPostingPlan as draft.
 */
export async function buildMondayContentPlan() {
  const weekStart = dubaiWeekStartMonday();
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const themes = await loadEditorKbThemes();

  const pendingCards = await db.postCard.findMany({
    where: {
      status: {
        in: [ContentState.awaitingKane, "awaiting_kane", ContentState.draft],
      },
      OR: [
        { scheduledAt: { gte: weekStart, lt: weekEnd } },
        { scheduledAt: null, updatedAt: { gte: weekStart } },
      ],
    },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  const complianceFails = await db.postCard.findMany({
    where: {
      OR: [
        { compliancePass: false },
        {
          status: {
            in: [
              ContentState.failed,
              "rejected",
              ContentState.compliance,
              ContentState.changesRequested,
            ],
          },
        },
        {
          asset: {
            state: {
              in: [ContentState.compliance, ContentState.changesRequested],
            },
          },
        },
      ],
    },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const scheduled = await db.postCard.findMany({
    where: {
      status: { in: [ContentState.scheduled, "scheduled"] },
      scheduledAt: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    include: { asset: true },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  });

  const gapDayLabels: string[] = [];
  const gapProposals: string[] = [];
  for (let d = 0; d < 7; d++) {
    const dayStart = new Date(weekStart);
    dayStart.setUTCDate(dayStart.getUTCDate() + d);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const count = scheduled.filter(
      (s) =>
        s.scheduledAt &&
        s.scheduledAt >= dayStart &&
        s.scheduledAt < dayEnd,
    ).length;
    if (count === 0) {
      const label = dayStart.toISOString().slice(0, 10);
      gapDayLabels.push(label);
      const proposals = await proposeCt6ReplacementCards(1);
      gapProposals.push(
        ...proposals.map((line) => `${line} · slot ${label}`),
      );
    }
  }

  const tomorrow = dubaiDayBounds(1);
  const scheduledTomorrow = await db.postCard.count({
    where: {
      status: { in: [ContentState.scheduled, "scheduled"] },
      scheduledAt: { gte: tomorrow.start, lt: tomorrow.end },
    },
  });
  if (scheduledTomorrow === 0) {
    const tLabel = tomorrow.start.toISOString().slice(0, 10);
    if (!gapDayLabels.includes(tLabel)) {
      gapDayLabels.push(tLabel);
      const proposals = await proposeCt6ReplacementCards(1);
      gapProposals.push(
        ...proposals.map((line) => `${line} · tomorrow ${tLabel}`),
      );
    }
  }

  const existing = await db.weeklyPostingPlan.findUnique({
    where: { weekStart },
  });

  const sampleBrief =
    pendingCards[0] != null
      ? buildLockedEditBrief({
          title: pendingCards[0].asset.title,
          platform: pendingCards[0].platform,
          account: pendingCards[0].account,
          themes: [
            ...tagsAsThemes(pendingCards[0].asset.tags),
            themes[0]!,
          ],
          briefId: `WPP-${weekStart.toISOString().slice(0, 10)}`,
        })
      : buildLockedEditBrief({
          title: "Week plan placeholder",
          platform: "instagram",
          account: "@theformulaperformance",
          themes,
          briefId: `WPP-${weekStart.toISOString().slice(0, 10)}`,
        });

  const notes = [
    `WPP status: ${existing?.status === "agreed" ? "agreed" : "draft"}`,
    `Pending Kane cards this week: ${pendingCards.length}`,
    `Compliance fails: ${complianceFails.length}`,
    `Scheduled this week: ${scheduled.length}`,
    `CT6 gap days: ${gapDayLabels.length ? gapDayLabels.join(", ") : "none"}`,
    `KB themes: ${themes.join(", ")}`,
    "",
    "Pending this week:",
    ...(pendingCards.length
      ? pendingCards.map(
          (c) =>
            `· ${c.platform}/${c.account} · ${c.asset.title} · ${c.status}`,
        )
      : ["· none"]),
    "",
    "Slots this week:",
    ...(scheduled.length
      ? scheduled.map(
          (s) =>
            `· ${s.scheduledAt?.toISOString().slice(0, 16) ?? "unset"} · ${s.platform} · ${s.asset.title}`,
        )
      : ["· none"]),
    "",
    "CT6 replacement proposals:",
    ...(gapProposals.length ? gapProposals : ["· none — calendar covered"]),
  ].join("\n");

  const plan =
    existing?.status === "agreed"
      ? existing
      : await db.weeklyPostingPlan.upsert({
          where: { weekStart },
          create: {
            weekStart,
            status: "draft",
            notes,
          },
          update: {
            status: "draft",
            notes,
            agreedAt: null,
          },
        });

  const weekLabel = weekStart.toISOString().slice(0, 10);
  const pack = [
    `<b>Monday content plan pack</b> · WPP-${weekLabel}`,
    `WeeklyPostingPlan status: ${plan.status}`,
    `Pending post cards this week: ${pendingCards.length}`,
    `Compliance fails: ${complianceFails.length}`,
    `Scheduled this week: ${scheduled.length}`,
    "",
    "<b>Pending post cards this week</b>",
    ...(pendingCards.length
      ? pendingCards.map(
          (c) =>
            `· ${c.platform}/${c.account} · ${c.asset.title} · ${c.status}`,
        )
      : ["· none"]),
    "",
    "<b>Compliance fails</b>",
    ...(complianceFails.length
      ? complianceFails.map(
          (c) =>
            `· ${c.asset.title} · ${c.complianceResult ?? c.status}`,
        )
      : ["· none"]),
    "",
    "<b>CT6 replacement proposals</b> (calendar gaps — text only, no publish)",
    ...(gapProposals.length ? gapProposals : ["· none — calendar covered"]),
    "",
    "<b>Edit brief</b> (from editor KB template + WPP / pending)",
    sampleBrief,
    "",
    "<b>Slots this week</b>",
    ...(scheduled.length
      ? scheduled.map(
          (s) =>
            `· ${s.scheduledAt?.toISOString().slice(0, 16) ?? "unset"} · ${s.platform} · ${s.asset.title}`,
        )
      : ["· none"]),
    "",
    "Agree the Weekly Posting Plan on /admin/content (or Telegram).",
    "This agent cannot publish. Kane approves every post card.",
  ].join("\n");

  await db.auditLog.create({
    data: {
      actor: "social-media-manager",
      action: "content.monday_plan",
      meta: {
        weekStart: weekLabel,
        planId: plan.id,
        status: plan.status,
        pending: pendingCards.length,
        complianceFails: complianceFails.length,
        scheduled: scheduled.length,
        ct6Gaps: gapDayLabels,
      },
    },
  });

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text: pack,
    });
  }

  return {
    pack,
    planId: plan.id,
    weekStart: weekLabel,
    status: plan.status,
    awaiting: pendingCards.length,
    complianceFails: complianceFails.length,
    scheduled: scheduled.length,
    ct6Gaps: gapDayLabels,
    ct6Proposals: gapProposals,
  };
}

export async function buildAffiliateMondayPrompt() {
  const scorecard = await computeAffiliateScorecard();
  const lemoni = await db.kpiValue.findMany({
    where: { personKey: "lemoni" },
    orderBy: { date: "desc" },
    take: 6,
  });

  const text = [
    "<b>Monday reminder — affiliate management structure</b>",
    "Build / review the affiliate structure this week.",
    "",
    "<b>Lemoni affiliate scorecard</b>",
    `· Affiliates: ${scorecard.affiliateCount}`,
    `· Codes: ${scorecard.codeCount}${scorecard.codes.length ? ` (${scorecard.codes.slice(0, 8).join(", ")}${scorecard.codes.length > 8 ? "…" : ""})` : ""}`,
    `· AK1 register %: ${scorecard.registerIntegrityPct}`,
    `· AK2 active %: ${scorecard.activeRatePct}`,
    `· AK5: ${scorecard.ak5}`,
    `· AK6: ${scorecard.ak6}`,
    "",
    "<b>PA KPIs (latest)</b>",
    ...(lemoni.length
      ? lemoni.map((k) => `· ${k.kpiId}: ${k.value}`)
      : ["· none yet"]),
    "",
    "Attach decisions in Sunday 12:00 planning.",
  ].join("\n");

  const kaneChatId = await getKaneTelegramChatId();
  if (kaneChatId) {
    await sendTelegramMessage({
      chatId: kaneChatId,
      text,
    });
  }

  return { text, scorecard };
}

export async function agreeWeeklyPostingPlan(actor: string) {
  const weekStart = dubaiWeekStartMonday();
  const plan = await db.weeklyPostingPlan.upsert({
    where: { weekStart },
    create: {
      weekStart,
      status: "agreed",
      agreedAt: new Date(),
      notes: "Agreed via admin",
    },
    update: {
      status: "agreed",
      agreedAt: new Date(),
    },
  });

  await db.auditLog.create({
    data: {
      actor,
      action: "content.wpp.agreed",
      entityType: "WeeklyPostingPlan",
      entityId: plan.id,
      meta: { weekStart: weekStart.toISOString().slice(0, 10) },
    },
  });

  return plan;
}
