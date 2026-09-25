/**
 * Roosevelt pack Phase 0–6 CODE deliverable checklist.
 * Status reflects code that exists (not live Kane sign-off).
 * Keys are never required for this module — connectors use resolveSecret + skip.
 */

export type SpecStatus =
  | "done"
  | "waiting_on_keys"
  | "waiting_on_kane_live"
  | "out_of_scope";

export type SpecPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SpecDeliverable = {
  id: string;
  phase: SpecPhase;
  title: string;
  status: SpecStatus;
  /** Short evidence / note for Kane */
  note: string;
  paths?: string[];
};

export type SpecCompletionReport = {
  generatedAt: string;
  summary: Record<SpecStatus, number>;
  byPhase: Record<SpecPhase, SpecDeliverable[]>;
  items: SpecDeliverable[];
};

/**
 * Structured checklist of implementable CODE deliverables.
 * Living document — keep statuses honest when code changes.
 */
export function getSpecCompletionChecklist(): SpecCompletionReport {
  const items: SpecDeliverable[] = [
    // ── Phase 0 ──────────────────────────────────────────────────
    {
      id: "p0-auth-2fa",
      phase: 0,
      title: "Auth + 2FA + role-gated admin",
      status: "done",
      note: "better-auth twoFactor; requireAdminSession + ROLE_PATHS",
      paths: ["src/lib/auth/server.ts", "src/lib/admin/staff.ts"],
    },
    {
      id: "p0-schema-seed",
      phase: 0,
      title: "Postgres schema + command seed",
      status: "done",
      note: "Prisma schema + scripts/seed-command.ts",
      paths: ["prisma", "scripts/seed-command.ts"],
    },
    {
      id: "p0-telegram-lock",
      phase: 0,
      title: "Telegram bot locked to Kane (+ Leah/Lemoni)",
      status: "waiting_on_keys",
      note: "isAllowedTelegramChat — needs TELEGRAM_* chat IDs in vault",
      paths: ["src/lib/telegram/client.ts", "src/app/api/telegram/webhook/route.ts"],
    },
    {
      id: "p0-audit-log",
      phase: 0,
      title: "Audit log table + writes",
      status: "done",
      note: "AuditLog used across content, approvals, finance",
      paths: ["src/lib/content/ops.ts", "src/lib/admin/approvals.ts"],
    },
    {
      id: "p0-contractor-access",
      phase: 0,
      title: "Signed contractor agreement + access register",
      status: "out_of_scope",
      note: "Kane / legal — not a code deliverable",
    },

    // ── Phase 1 ──────────────────────────────────────────────────
    {
      id: "p1-shopify-connector",
      phase: 1,
      title: "Shopify read connector + Money/Supplements pages",
      status: "waiting_on_keys",
      note: "pullShopifyOrders — skips without SHOPIFY_*",
      paths: [
        "src/lib/connectors/pulls.ts",
        "src/app/(admin)/admin/money/page.tsx",
        "src/app/(admin)/admin/supplements/page.tsx",
      ],
    },
    {
      id: "p1-stripe-connector",
      phase: 1,
      title: "Stripe money mirror",
      status: "waiting_on_keys",
      note: "pullStripeMoney — skips without STRIPE_SECRET_KEY",
      paths: ["src/lib/connectors/pulls.ts"],
    },
    {
      id: "p1-meta-connector",
      phase: 1,
      title: "Meta Ads insights + Meta page",
      status: "waiting_on_keys",
      note: "pullMetaAdInsights + Layer 1 / £1k gate tiles",
      paths: [
        "src/lib/connectors/pulls.ts",
        "src/app/(admin)/admin/meta/page.tsx",
        "src/lib/metrics/economics.ts",
      ],
    },
    {
      id: "p1-command-page",
      phase: 1,
      title: "Command overview page",
      status: "done",
      note: "Warehouse-backed Command dashboard",
      paths: ["src/app/(admin)/admin/page.tsx"],
    },
    {
      id: "p1-amer-break-even",
      phase: 1,
      title: "aMER / contribution / break-even from inputs",
      status: "done",
      note: "Calculated from COGS/fees/fulfilment — never hardcoded",
      paths: ["src/lib/metrics/economics.ts"],
    },
    {
      id: "p1-live-parity",
      phase: 1,
      title: "Live Shopify/Meta £1 parity demo",
      status: "waiting_on_kane_live",
      note: "scripts/verify-money-meta-parity.ts — needs live keys + Kane demo",
      paths: ["scripts/verify-money-meta-parity.ts"],
    },

    // ── Phase 2 ──────────────────────────────────────────────────
    {
      id: "p2-daily-report-todo",
      phase: 2,
      title: "Daily report + to-do Telegram schedules",
      status: "waiting_on_keys",
      note: "Trigger crons skip without TELEGRAM_KANE_CHAT_ID",
      paths: [
        "src/trigger/command-ops.ts",
        "src/lib/alerts/daily-report.ts",
      ],
    },
    {
      id: "p2-alert-engine",
      phase: 2,
      title: "P1/P2/P3 alert engine + editable thresholds",
      status: "done",
      note: "evaluateAlertRules + Settings threshold editor + test-fire",
      paths: [
        "src/lib/alerts/engine.ts",
        "src/lib/alerts/rules-config.ts",
        "src/app/(admin)/admin/settings/page.tsx",
      ],
    },
    {
      id: "p2-quiet-hours-digest",
      phase: 2,
      title: "Quiet hours + P2 digest",
      status: "done",
      note: "p2DigestSchedule + cadence helpers",
      paths: ["src/lib/alerts/p2-digest.ts", "src/trigger/command-ops.ts"],
    },
    {
      id: "p2-uptime-n8n",
      phase: 2,
      title: "Uptime + n8n health pulls",
      status: "waiting_on_keys",
      note: "Graceful skip without N8N_*",
      paths: ["src/lib/connectors/uptime-n8n.ts"],
    },
    {
      id: "p2-five-day-report",
      phase: 2,
      title: "5 consecutive live daily reports",
      status: "waiting_on_kane_live",
      note: "Code scheduled; acceptance needs production Telegram + Kane watch",
    },

    // ── Phase 3 ──────────────────────────────────────────────────
    {
      id: "p3-leah-csv",
      phase: 3,
      title: "Leah finance CSV upload + validation",
      status: "done",
      note: "parse + persist; wrong category rejected with row",
      paths: [
        "src/lib/finance/parse-leah-csv.ts",
        "src/lib/finance/persist-leah-csv.ts",
        "src/actions/admin/finance.action.ts",
      ],
    },
    {
      id: "p3-payout-reconcile",
      phase: 3,
      title: "Stripe/Shopify payout reconciliation",
      status: "waiting_on_keys",
      note: "Needs Stripe/Shopify pulls live",
      paths: [
        "src/lib/finance/payout-reconcile.ts",
        "src/lib/finance/stripe-payouts.ts",
      ],
    },
    {
      id: "p3-supplier-brief",
      phase: 3,
      title: "Supplier payment brief + cash / DUE rows",
      status: "done",
      note: "Telegram brief builder from DUE rows",
      paths: ["src/lib/finance/supplier-brief.ts"],
    },
    {
      id: "p3-team-pay-visibility",
      phase: 3,
      title: "Team pay rows Kane-only",
      status: "done",
      note: "Money page gated; non-Kane ROLE_PATHS limited",
      paths: ["src/app/(admin)/admin/money/page.tsx", "src/lib/admin/staff.ts"],
    },
    {
      id: "p3-live-finance-demo",
      phase: 3,
      title: "Live template + payout + brief demo",
      status: "waiting_on_kane_live",
      note: "Acceptance needs Leah upload + Telegram delivery",
    },

    // ── Phase 4 ──────────────────────────────────────────────────
    {
      id: "p4-scorecards-team",
      phase: 4,
      title: "Person scorecards + Team + My Desk",
      status: "done",
      note: "Canonical K*/AK*/PK*/UK*/IK*/F* ids; unmeasurable KPIs labelled not measurable yet",
      paths: [
        "src/lib/scorecards/compute.ts",
        "src/lib/scorecards/weekly-review.ts",
        "src/app/(admin)/admin/team/page.tsx",
      ],
    },
    {
      id: "p4-programmes",
      phase: 4,
      title: "Coaching + Training programme pages",
      status: "done",
      note: "Admin programme surfaces",
      paths: [
        "src/app/(admin)/admin/coaching/page.tsx",
        "src/app/(admin)/admin/training/page.tsx",
      ],
    },
    {
      id: "p4-ghl-klaviyo",
      phase: 4,
      title: "GHL + Klaviyo connectors",
      status: "waiting_on_keys",
      note: "Lead threads + campaigns; skip without credentials",
      paths: ["src/lib/connectors/ghl-klaviyo.ts"],
    },
    {
      id: "p4-gmail-triage",
      phase: 4,
      title: "Gmail triage + draft replies (C2 side-effect P1)",
      status: "waiting_on_keys",
      note: "Needs GMAIL_OAuth secrets",
      paths: ["src/lib/connectors/gmail.ts"],
    },
    {
      id: "p4-dm-channels",
      phase: 4,
      title: "Instagram / WhatsApp / Telegram growth pages",
      status: "done",
      note: "Lead threads + response gap UI; WA keys for live send",
      paths: [
        "src/app/(admin)/admin/growth/instagram/page.tsx",
        "src/app/(admin)/admin/growth/whatsapp/page.tsx",
        "src/app/(admin)/admin/growth/telegram/page.tsx",
      ],
    },
    {
      id: "p4-affiliates",
      phase: 4,
      title: "Affiliate scorecard (Lemoni)",
      status: "done",
      note: "Per-affiliate contribution; gaps labelled not measurable",
      paths: ["src/lib/scorecards/affiliates.ts"],
    },
    {
      id: "p4-live-triggers",
      phase: 4,
      title: "Live DM / email / PY1 trigger demos",
      status: "waiting_on_kane_live",
      note: "Rules coded; needs sandbox events + Kane sign-off",
      paths: ["src/lib/alerts/engine.ts", "src/lib/alerts/rules-config.ts"],
    },
    {
      id: "p4-indigo-workflows",
      phase: 4,
      title: "GHL/n8n workflow edits",
      status: "out_of_scope",
      note: "Indigo owns automations — Roosevelt reads status only",
    },

    // ── Phase 5 ──────────────────────────────────────────────────
    {
      id: "p5-cto-agent",
      phase: 5,
      title: "CTO agent + specialist checker",
      status: "waiting_on_keys",
      note: "Idle without GEMINI_API_KEY; subscription/money hard-blocked",
      paths: ["src/lib/cto/agent.ts", "src/lib/cto/specialist.ts"],
    },
    {
      id: "p5-approvals",
      phase: 5,
      title: "Approval flow (token, expiry, payload hash, dispatch)",
      status: "done",
      note: "Single-use tokens; dispatch → Meta pause / Gmail / quotes / content",
      paths: [
        "src/lib/admin/approvals.ts",
        "src/lib/admin/executors/dispatch.ts",
        "src/lib/admin/executors/meta-pause.ts",
      ],
    },
    {
      id: "p5-quote-batch",
      phase: 5,
      title: "Sunday quote batch (approve before WhatsApp)",
      status: "done",
      note: "Posts nothing until batch approved; Indigo owns WA group send path",
      paths: ["src/lib/training/quote-batch.ts"],
    },
    {
      id: "p5-revolut",
      phase: 5,
      title: "Revolut Business cash read",
      status: "waiting_on_keys",
      note: "pullRevolutBalances skips without REVOLUT_API_TOKEN",
      paths: ["src/lib/connectors/revolut.ts"],
    },
    {
      id: "p5-monday-affiliate",
      phase: 5,
      title: "Monday affiliate-structure prompt",
      status: "done",
      note: "Scheduled Telegram prompt",
      paths: ["src/lib/content/social-manager.ts", "src/trigger/command-ops.ts"],
    },
    {
      id: "p5-approval-live",
      phase: 5,
      title: "Live Meta pause approve + verify read-back",
      status: "waiting_on_kane_live",
      note: "Executor + Telegram verification coded; needs Kane tap demo",
    },

    // ── Phase 6 ──────────────────────────────────────────────────
    {
      id: "p6-frame",
      phase: 6,
      title: "Frame.io V4 client + webhook",
      status: "waiting_on_keys",
      note: "Remote upload + asset meta; skip without FRAME_IO_TOKEN",
      paths: [
        "src/lib/content/frame-client.ts",
        "src/app/api/frame/webhook/route.ts",
      ],
    },
    {
      id: "p6-content-studio",
      phase: 6,
      title: "Content Studio UI + upload + states",
      status: "done",
      note: "Phone/creator upload; multipart Blob for 4K; register licence lookup",
      paths: [
        "src/app/(admin)/admin/content/page.tsx",
        "src/actions/admin/content-upload.action.ts",
        "src/lib/content/creator-licence.ts",
        "src/app/api/admin/content/blob-upload/route.ts",
        "src/lib/content/states.ts",
      ],
    },
    {
      id: "p6-blob",
      phase: 6,
      title: "Blob media storage for uploads",
      status: "waiting_on_keys",
      note: "Client multipart up to 2GB when BLOB_READ_WRITE_TOKEN present",
      paths: [
        "src/lib/content/media-storage.ts",
        "src/app/api/admin/content/blob-upload/route.ts",
      ],
    },
    {
      id: "p6-compliance",
      phase: 6,
      title: "Compliance OCR/ASR + QC checklist",
      status: "waiting_on_keys",
      note: "Gemini OCR/ASR when GEMINI_API_KEY; Frame transcript path noted; VIDEO_ASR_PENDING only if no key/media",
      paths: [
        "src/lib/content/compliance-enrich.ts",
        "src/lib/content/compliance.ts",
        "src/lib/content/qc-checks.ts",
      ],
    },
    {
      id: "p6-approvals-publish",
      phase: 6,
      title: "Post cards, Kane approval, schedule, kill switch",
      status: "done",
      note: "every_post default; autopilot Kane-only after eligibility",
      paths: [
        "src/lib/content/publish.ts",
        "src/lib/content/approval-mode.ts",
        "src/lib/content/void-approval.ts",
      ],
    },
    {
      id: "p6-adapters",
      phase: 6,
      title: "IG / TikTok / YouTube publish adapters + audited provider",
      status: "waiting_on_kane_live",
      note: "Direct adapters ready; CONTENT_PUBLISH_PROVIDER_URL routes all platforms until audits",
      paths: [
        "src/lib/content/adapters/instagram.ts",
        "src/lib/content/adapters/tiktok.ts",
        "src/lib/content/adapters/youtube.ts",
        "src/lib/content/adapters/audited-provider.ts",
      ],
    },
    {
      id: "p6-metrics",
      phase: 6,
      title: "24h / 72h / 7d post metrics pulls",
      status: "waiting_on_keys",
      note: "IG/TT/YT insights when token + postUrl id present",
      paths: ["src/lib/content/metrics-pull.ts"],
    },
    {
      id: "p6-editor-kb",
      phase: 6,
      title: "Editor knowledge base",
      status: "done",
      note: "docs/editor-knowledge-base.md linked into SMM briefs + QC",
      paths: ["docs/editor-knowledge-base.md", "src/lib/content/social-manager.ts"],
    },
    {
      id: "p6-smm-agent",
      phase: 6,
      title: "Social media manager agent (no publish tool)",
      status: "done",
      note: "Monday plan, filming list, edit brief; SMM scored separately",
      paths: [
        "src/lib/content/social-manager.ts",
        "src/lib/content/smm-score.ts",
      ],
    },
    {
      id: "p6-runbook",
      phase: 6,
      title: "Command runbook + keys catalogue + cost estimate",
      status: "done",
      note: "docs/command-runbook.md — Keys to paste + monthly cost ballpark",
      paths: ["docs/command-runbook.md", "src/lib/secrets/catalog.ts"],
    },
    {
      id: "p6-astra",
      phase: 6,
      title: "GPT-6 Astra rough-cut pilot",
      status: "out_of_scope",
      note: "Optional isolated machine only if Kane approves — not in this pack",
    },
    {
      id: "p6-platform-audits",
      phase: 6,
      title: "Meta / TikTok / YouTube publish audits",
      status: "waiting_on_kane_live",
      note: "External app review — cannot be code-fixed",
    },
    {
      id: "p5-quote-ghl-send",
      phase: 5,
      title: "Quote batch WhatsApp send via GHL",
      status: "out_of_scope",
      note: "Queues for Indigo after Kane approve — Roosevelt does not edit GHL send",
      paths: ["src/lib/training/quote-batch.ts"],
    },
  ];

  const byPhase = {
    0: items.filter((i) => i.phase === 0),
    1: items.filter((i) => i.phase === 1),
    2: items.filter((i) => i.phase === 2),
    3: items.filter((i) => i.phase === 3),
    4: items.filter((i) => i.phase === 4),
    5: items.filter((i) => i.phase === 5),
    6: items.filter((i) => i.phase === 6),
  } as Record<SpecPhase, SpecDeliverable[]>;

  const summary: Record<SpecStatus, number> = {
    done: 0,
    waiting_on_keys: 0,
    waiting_on_kane_live: 0,
    out_of_scope: 0,
  };
  for (const item of items) {
    summary[item.status] += 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    summary,
    byPhase,
    items,
  };
}

export const SPEC_STATUS_LABEL: Record<SpecStatus, string> = {
  done: "Code done",
  waiting_on_keys: "Waiting on keys",
  waiting_on_kane_live: "Waiting on Kane / live",
  out_of_scope: "Out of scope",
};
