# TFP Command ops runbook

Operating guide for `/admin` (TFP Command) and the CTO Telegram loop.
All times below are **Dubai (GST, UTC+4)** unless noted.

## Daily Telegram cadence

| Dubai time | What |
|---|---|
| ~07:30 | Daily to-do list (pinned / Telegram) |
| 08:00 | Daily report |
| 08:00–22:00 | P2 digests every 2 hours |
| 09:00 Mon | Monday pack: content plan, affiliate reminder, weekly person reviews |
| 18:00 Sun | Motivation quote batch draft (Kane approve — not sent yet) |
| 20:00 | Tomorrow's calls (CL4) + tomorrow's posts (CT12) |
| 23:00–07:00 | Quiet hours — only P1 marked **wake** breaks through |

Cron schedules in Trigger.dev use UTC (Dubai − 4h). Example: Monday 09:00 Dubai ≈ `05:00 UTC`.

## How approvals work

1. Something write-capable (CTO, Gmail triage, Meta pause draft, quote batch, content card) runs a **specialist check**.
2. If the check passes, an `ApprovalRequest` is created (`pending`).
3. Kane gets a Telegram card and/or a dashboard card with **Approve** / **Reject**.
4. **Silence is never approval.** One approval authorises one action (or a named batch).
5. Pending requests expire when `expiresAt` passes (`command.expire-approvals`).
6. Organic social: Kane approves every finished **post card**; approval schedules it. The Weekly Posting Plan does **not** publish by itself.

Gmail: triage drafts only. Send runs through specialist + Kane approval (`executeGmailSend`).

## Vault unlock (Integrations)

Connector credentials live encrypted in `IntegrationSecret`, managed on `/admin/integrations`.

1. Set the vault passcode once (stored as `INTEGRATIONS_VAULT_PASSCODE`, never shown in the catalog).
2. Enter the passcode to unlock — cookie `tfp_integrations_vault` lasts ~30 minutes.
3. While unlocked, Kane can create/update/delete credential fields from the catalog.
4. Writes without unlock throw: *Integrations vault is locked*.
5. Runtime code uses `resolveSecret(key)`: **DB secret wins**, then process env.

## Connector list

| ID | Source | Cadence (approx) | Write gated |
|---|---|---|---|
| S1 | Shopify Admin GraphQL | 15 min + webhooks | No |
| S2 | Stripe | Webhooks + hourly | No |
| S3 | Meta Marketing API | Hourly | No (pause drafts need Kane) |
| S4 | Klaviyo | Hourly | No |
| S5 | GoHighLevel | 15 min | No (read CRM threads) |
| S6 | n8n | 5 min | No |
| S7 | Gmail | 5 min | Yes (send via approval) |
| S8 | Calendly | 15 min / webhooks | No |
| S9 | Instagram DMs (via GHL) | 15 min | No |
| S10 | Leah finance template | Daily upload | No |
| S11 | Uptime checks | 5 min | No |
| S12 | Revolut Business | 6-hourly | No |
| S13 | Frame.io V4 | Webhooks | No |
| S14 | Instagram Graph publish | On schedule | Yes |
| S15 | TikTok Content Posting | On schedule | Yes |
| S16 | YouTube Data + Analytics | On schedule | Yes |

Health: `/admin/integrations` and `ConnectorRun` rows. Stale source → alert **SY5** (default 6h without `lastSuccessAt`).

Klaviyo conversion metric: set `KLAVIYO_CONVERSION_METRIC_ID`, or leave blank so the pull resolves **Placed Order** from the metrics API.

## Alert thresholds

Defaults live in `src/lib/alerts/rules-config.ts`. Live values are in `AlertThreshold`, editable under `/admin/settings`.

Notable defaults:

| Rule | Meaning | Default |
|---|---|---|
| R1 | Store quiet (no Shopify orders) | 6 hours |
| R2 | Today revenue vs weekday baseline | 50% |
| L1 | High-intent DM unanswered | 60 minutes |
| CA1 / CA2 | Cash warning / critical | £10k / £5k |
| ST1 / ST2 | Days of cover | 30 / 7 |
| SY5 | Connector stale | 6 hours |
| M3 | Daily Meta spend ceiling | £1000 (+15% over) |
| T1_SILENT | Silent training members share | 20% |
| CT2 | Awaiting Kane before slot | 12 hours |
| CT10 | Negative comment spike | 3× baseline |
| CT11 | Weekly Posting Plan not agreed | Mon ≥ 18:00 Dubai |

Engine evaluates every 5 minutes (`command.alerts-schedule`).

## Content publish flow

1. **Upload** on `/admin/content` (Kane or Lemoni). Creator licence claimed → loose affiliate name/code check; if none found, licence is cleared with note *not on affiliate register* and asset stays at **tagged**.
2. Compliance check on caption. Pass → **ready** / post card **awaiting_kane**. Fail → **changes_requested**.
3. **Monday** social-media-manager creates a **Weekly Posting Plan** draft (`WeeklyPostingPlan`, status `draft`) and Telegram pack. Kane taps **Agree this week's plan** on Content (or will get CT11 after Mon 18:00 if not agreed).
4. Kane **Approve & schedule** on each finished post card → schedules into its slot.
5. Scheduler / publish adapter posts at the slot (`publishPostCard`). Failures mark **failed** and alert; no silent skip.
6. **Pause all posting** / per-account pause on Settings; kill switch stops scheduled posts within the next cycle.
7. Metrics pull stamps 24h / 72h / 7d checkpoints back onto post cards.

Sunday quote batch (training WhatsApp) is drafted by Gemini when `GEMINI_API_KEY` is set, otherwise starters — still requires Kane approve before anything is queued.

## Money / Meta parity (Phase 1)

Offline checklist for warehouse vs Analytics / Ads Manager:

```bash
pnpm verify:money-meta
# optional: yesterday's Shopify Analytics net in GBP pounds
SHOPIFY_ANALYTICS_HINT=1234.56 pnpm verify:money-meta
```

Prints warehouse net, AdDaily spend by ad set, break-even inputs, and PASS/FAIL lines.
Always exits 0 — FAIL is checklist status, not a process failure. Compare Meta totals to Ads Manager by eye (within £1).

## Where to look when something is wrong

| Question | Surface |
|---|---|
| Did Telegram fire? | Bot chat + Trigger.dev task runs |
| Is a connector dead? | `/admin/integrations` · `ConnectorRun` |
| Why no publish? | Post card status, channel `paused`, compliance, missing tokens |
| Approval stuck? | `/admin` approvals · `ApprovalRequest.status` |
| Alert spam / miss? | `/admin/settings` thresholds · `Alert` rows |
| Vault can't save? | Unlock passcode first |
| Shopify/Meta £1 match? | `pnpm verify:money-meta` |
