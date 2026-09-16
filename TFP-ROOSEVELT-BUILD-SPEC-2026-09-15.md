# THE FORMULA PERFORMANCE: CRM DASHBOARD, CTO AGENT AND CONTENT STUDIO
## Build specification for Roosevelt (single document)

**From:** Kane Mousah, CEO  
**Version:** v1.0, 15 September 2026  
**Status:** Complete build specification. Replaces every earlier CTO-agent brief sent or drafted for Roosevelt.

**How to read this document:** it is one file made of numbered parts. Wherever the text says "file 03", "file 07 section 7" or "people/02-LEMONI.md", it means Part 03, Part 07 section 7, or Part P2 of this document. Leah's CSV template is in Appendix A.

## CONTENTS

- **Part 00:** Read me first: scope, rules, step 0
- **Part 01:** System blueprint
- **Part 02:** CTO agent specification
- **Part 03:** Alerts, daily report, to-do list, cadence
- **Part 04:** Finance feed, P&L, supplier payment brief
- **Part 05:** Meta strategy: Nathan / Blue Sense state
- **Part 06:** Build phases and acceptance tests
- **Part 07:** Content studio
- **Part P1:** Person file: Leah
- **Part P2:** Person file: Lemoni
- **Part P3:** Person file: Indigo
- **Part P4:** Person file: Asim
- **Appendix A:** Leah's daily finance template (CSV)

---

# PART 00

## THE FORMULA PERFORMANCE: CRM + CTO AGENT BUILD PACK

**For:** Roosevelt (Flyn AI), software engineer
**From:** Kane Mousah, CEO
**Version:** v1.0, 15 September 2026
**Status:** Build specification. Replaces every earlier CTO-agent brief sent or drafted for you (9 Sep 2026 build spec and CTO operator document). If anything in an older document disagrees with this pack, this pack wins.

---

### 1. WHAT YOU ARE BUILDING, IN ONE PARAGRAPH

Two things that share one data layer. **First, a management CRM dashboard**: a private, login-protected web app that shows Kane the whole business on one screen: money, supplements, the coaching programme, the training programme, Meta ads, email, DMs, fulfilment and every team member's scorecard. **Second, a CTO agent**: an AI operator that reads the same data every day, reviews every person's position, triages email and DMs, reports to Kane each morning on Telegram, fires instant Telegram alerts when something breaks, and drafts fixes that only execute after Kane taps Approve. **Third, a content studio**: Kane and Lemoni upload content from their phones, the editor cuts it in Premiere Pro, Kane reviews it, it passes a compliance check, and approved posts go out on a schedule to Instagram, TikTok, YouTube Shorts and Kane's YouTube channel, with performance flowing back into the dashboard. The aim is the simplest possible analytics for Kane, easy direction, easy reporting.

### 2. THE THREE BUSINESS LINES THE SYSTEM COVERS

| Line | What it is | Where the money lands |
|---|---|---|
| **Supplements** | Shopify store `b7fd08-ce.myshopify.com` (theformulaperformance.com). Complete Stack led, subscriptions via Kaching + Loop | Shopify Payments |
| **Coaching programme** | High-ticket 1:1 tiers: Analysis, Performance, Pro, Elite | Stripe |
| **Training programme** | 8-week "Challenge" at `train.theformulaperformance.com`: training, nutrition, WhatsApp AI coach, leaderboard, community. Monthly membership | Stripe |

Finance view covers **TFP business accounts only**: Stripe, Revolut Business, Shopify payouts.

### 3. READING ORDER

| # | File | What it gives you |
|---|---|---|
| 00 | This file | Scope, rules, step 0 |
| 01 | `01-SYSTEM-BLUEPRINT.md` | Architecture, data sources, data model, dashboard pages |
| 02 | `02-CTO-AGENT-SPEC.md` | Agent mandate, powers, gates, approval flow, model choice |
| 03 | `03-ALERTS-AND-DAILY-REPORT.md` | Every instant trigger, the daily report, weekly cadence |
| 04 | `04-FINANCE-FEED-AND-PNL.md` | Leah's fixed daily template, P&L logic, supplier-payment brief |
| 05 | `05-META-NATHAN-STRATEGY.md` | Current Meta strategy state and the metrics the dashboard must carry |
| 06 | `06-BUILD-PHASES-AND-ACCEPTANCE.md` | Build order, acceptance tests, definition of done |
| 07 | `07-CONTENT-STUDIO.md` | Upload, in-house Premiere Pro editing, review, compliance, scheduling, publishing to Instagram, TikTok, YouTube Shorts and YouTube, the required editor knowledge base (section 12) and the social media manager agent (section 13) |
| P1 | `people/01-LEAH.md` | Leah's exact position and scorecard |
| P2 | `people/02-LEMONI.md` | Lemoni's exact position and scorecard |
| P3 | `people/03-INDIGO.md` | Indigo's exact position and the boundary with your build |
| P4 | `people/04-ASIM.md` | Asim's exact position and scorecard |
| CSV | `leah-daily-finance-template.csv` | The template file itself |

### 4. STEP 0: BEFORE ANY REAL DATA (non-negotiable)

You will see bank data, Stripe data and UK customer personal data. Under UK GDPR that data is TFP's liability.

1. **Contractor agreement with confidentiality and data-processing clauses signed.** Until then you build against the spec and dummy data only. No live Stripe, Revolut, Shopify customer, Gmail, GHL or Instagram access.
2. **Named, scoped credentials only.** Your own read-only keys per system, individually revocable. Never a shared or master token.
3. **Access register.** You send Kane a list of every access you hold (including the existing Vercel/DNS rights) with the reason for each. Anything not needed for this build is removed.
4. **Secrets live in the app's secret store**, never in code, chat, WhatsApp, Telegram or documents.

### 5. THE RULES THAT SHAPE EVERY DESIGN DECISION

These are Kane's operating rules. They are requirements, not preferences.

1. **Reads are free. Writes stop.** The system may read and analyse anything in scope. Nothing writes, sends, publishes, deletes, refunds or moves money without Kane's explicit per-action approval.
2. **One approval authorises one action.** No standing approvals unless Kane approves a named batch as a batch. Silence is never approval. No "default to proceed". Organic social posts: Kane approves every finished post before it is scheduled (file 07 section 7).
3. **No agent ever moves money.** Payments are made by a human after approval.
4. **Specialist check before any Meta, Shopify or Klaviyo write.** The proposed action is reviewed read-only first (is it correct, what else does it touch, what breaks, what is the rollback, does it touch subscriptions) and that verdict is shown to Kane next to the proposal.
5. **Subscriptions are no-touch.** Nothing may change Kaching or Loop selling plans, subscription contracts, renewals or the subscriber sign-up path. Read-only mirror only.
6. **No blended number is a verdict.** Performance is shown per ad set, per affiliate, per setter, per product. Averages that span a change (new ad, budget edit, stock-out) are split before and after.
7. **Compliance.** No hormone, testosterone or TRT claims in anything the system drafts for Meta. Health or adverse-reaction complaints always escalate to Kane.
8. **Label every number** as verified (live pull), recorded (from a document) or calculated.
9. **Do not edit Indigo's GHL or n8n workflows.** Read their status only. See `people/03-INDIGO.md`.

### 6. DECISIONS ALREADY TAKEN FOR THIS BUILD (15 Sep 2026)

| Decision | Answer |
|---|---|
| Dashboard hosting | Standalone, login-protected web app on Vercel |
| CTO channel | Telegram (daily report, instant alerts, approval buttons) |
| CTO powers | Read everything in scope, draft fixes, ask Kane on Telegram; specialist check before any write |
| Finance input | Leah fills a fixed daily template (file 04) |
| Finance scope | TFP business only |
| Person files | Leah, Lemoni, Indigo, Asim |
| Leah's authority | Refunds up to £50. Every supplier payment goes to Kane, with a CTO financial-position brief attached |
| Asim's standard | Every UK order dispatched within 24 hours of payment |
| Lemoni's position | Head of Affiliates plus Kane's PA (calendar, call tracking, reminders) |
| Weekly rhythm | Sunday 12:00 planning session on Lemoni's report. Monday content strategy planning. Wednesday and Sunday filming |
| Kane's day | CTO sends a daily to-do list in a fixed structure; it only changes for priority appointments or major issues |
| Content studio | Kane uploads. Content is edited in-house in Premiere Pro, QC'd, compliance-checked and captioned without him. Every finished post comes to Kane; once he approves it, it is scheduled and posts automatically to Instagram, TikTok, YouTube Shorts and Kane's YouTube. Strategy and slots are agreed in a Monday review with the social media manager agent and CTO (file 07) |

### 7. WHAT YOU SEND BACK BEFORE BUILDING

1. Confirmation of Step 0 (agreement, access register).
2. Your stack choice against file 01 section 2, and any disagreement with the architecture, with reasons.
3. The list of credentials you need, per system, with the exact read scopes.
4. A dated plan against the phases in file 06.
5. Any question where this pack is ambiguous. Do not guess.

---

# PART 01

## 01. SYSTEM BLUEPRINT

### 1. SHAPE OF THE SYSTEM

```
                         KANE
             Telegram (report, alerts, Approve)  +  Dashboard (web)
                          |                              |
                 +--------v------------------------------v--------+
                 |              TFP COMMAND APP (Vercel)           |
                 |  Dashboard UI  |  API  |  Scheduler  |  Telegram |
                 +--------+--------------------+-------------------+
                          |                    |
                 +--------v-------+    +-------v-----------------+
                 |  DATA LAYER    |<---|  CTO AGENT (Claude API)  |
                 |  Postgres      |    |  reads data, drafts,     |
                 |  warehouse     |    |  raises approvals        |
                 +--------^-------+    +-------+-----------------+
                          |                    | approved writes only,
            read-only     |                    | after specialist check
            connectors    |                    v
   Shopify . Stripe . Meta . Klaviyo . GHL . n8n (status) . Gmail
   Calendly . Instagram DMs . Leah's daily template . Uptime checks
```

**Principle:** connectors pull on a schedule into one warehouse. The dashboard and the CTO agent both read the warehouse, never the live APIs directly, so both see the same number. Alerts fire from the warehouse and from webhooks.

### 2. RECOMMENDED STACK (you may propose alternatives with reasons)

| Layer | Recommendation | Why |
|---|---|---|
| App + UI | Next.js (TypeScript) on Vercel | You already work on Vercel |
| Auth | Email + 2FA, role-based (Kane full; Leah, Lemoni limited views later) | Bank and customer data |
| Database | Managed Postgres (Neon or Supabase), EU/UK region | Relational joins across customers, orders, programmes |
| Jobs | Vercel Cron for pulls; a queue for retries | Scheduled connectors and report generation |
| Webhooks | Shopify, Stripe, Calendly, Klaviyo where available | Instant alerts without polling |
| Agent | Anthropic Claude API with tool use (see file 02) | Reasoning over the warehouse, drafting, approvals |
| Messaging | Telegram Bot API, locked to Kane's chat ID | Chosen channel |
| Secrets | Vercel encrypted env vars or a secrets manager | Step 0 rule 4 |
| Logs | Every connector run, alert, draft, approval and write stored with timestamps | Audit trail |

### 3. DATA SOURCES (ALL READ-ONLY UNLESS STATED)

| # | Source | What to pull | Frequency | Notes and known issues |
|---|---|---|---|---|
| S1 | **Shopify Admin GraphQL** (`b7fd08-ce.myshopify.com`) | Orders, line items, discounts, refunds, fulfilments and tracking, customers, products, variant cost (COGS), inventory, subscription contracts (mirror only) | 15 min + webhooks | Bundle app auto-fulfils the parent line while components may not ship: check component tracking, not the parent flag. Stack orders have zero discount on the bundle; subscription discount sits on single SKUs |
| S2 | **Stripe** (restricted read key created by Leah, who owns the account) | Charges, payment intents, subscriptions, invoices, disputes, refunds, payouts, balance, coupon/promo codes | Webhooks + hourly | Coaching payments carry no metadata and trigger no onboarding: the system must detect them by amount/product and alert. Training programme checkout carries metadata into onboarding |
| S3 | **Meta Marketing API** (ad account `act_1225520148676719`) | Spend, impressions, clicks, purchases, purchase value on 7-day click AND incremental attribution (compare-attribution columns), per ad set and ad, daily. Ad review status, account status, billing events | Hourly | The Meta MCP route fails on appsecret_proof; use direct Graph API with a system-user token. Never change attribution settings on live ad sets |
| S4 | **Klaviyo API** | Campaign and flow reports (recipients, opens, clicks, revenue), flow status, bounce/spam rates, list sizes | Hourly | Revenue per send is a key number |
| S5 | **GoHighLevel** (your own scoped Private Integration Token, read-only) | Contacts, pipelines/opportunities, calendars, conversations (Instagram and WhatsApp), tags for training-programme members | 15 min | GHL automation belongs to Indigo: read only, never edit workflows |
| S6 | **n8n API** (read executions only) | Execution success/failure per workflow, last run time | 5 min | Escalation Router workflow failure is a P1 alert |
| S7 | **Gmail API** (info@ and the TFP operations inbox) | Message metadata and body for triage | 5 min | Read and label only. Drafting is allowed; sending is gated |
| S8 | **Calendly API** + webhooks | Bookings, cancellations, reschedules, no-shows, event types | Webhooks | Kane's timezone is Dubai (GMT+4) |
| S9 | **Instagram DMs** | Via GHL conversations (S5) or Boosend if connected | 15 min | ManyChat connection currently unreliable; do not build on it |
| S10 | **Leah's daily finance template** | Cash in/out, balances, payments due | Daily upload | File 04. Uploaded on the dashboard or sent as a file to the Telegram bot |
| S11 | **Uptime checks** | Home page, product page, cart, checkout start, train subdomain, booking link | 5 min | Synthetic HTTP checks; checkout flow check does not place orders |
| S12 | **Revolut Business API** | Balances and transactions | Phase 5 | Replaces the manual template's bank rows later. Read-only |
| S13 | **Frame.io V4 API** + webhooks | Assets, versions, comments, review status | Webhooks | Media hub for the content studio (file 07). V4 only; V2 is being removed 1 Dec 2026 |
| S14 | **Instagram Graph API** | Publish (post cards Kane approved), media insights, publishing limit, token status | Hourly + on publish | Write path gated by Kane's approval (file 07 section 7) |
| S15 | **TikTok Content Posting API** + video stats | Publish (approved only), post status, video metrics | Hourly + on publish | Private-only posting until TikTok audits the app |
| S16 | **YouTube Data API v3 + YouTube Analytics API** | Upload (approved only), video status, analytics | Hourly + on publish | Uploads private until Google audits the project |

### 4. DATA MODEL (CORE ENTITIES)

| Entity | Key fields | Notes |
|---|---|---|
| `business_line` | supplements, coaching, training, shared | Every money row is tagged to one |
| `person_customer` | id, email (primary key for matching), phone, name, shopify_id, stripe_id, ghl_id, ig_handle | **Identity resolution on email, then phone. Never merge on name.** There is a coaching client whose name is near-identical to the fulfilment partner's |
| `order` | shopify order, lines, gross, discount, net, COGS, shipping, refunded, is_subscription, is_stack, new_vs_returning | |
| `subscription_mirror` | contract id, product, interval, status, next billing | Read-only, never written |
| `programme_enrolment` | customer, line (coaching/training), tier, price, start date, current week, end date, status, payment status | Training: 8-week clock; flags completions due |
| `payment` | Stripe charge, amount, product/tier inferred, status, dispute flag | |
| `call` | Calendly event, invitee, type, booked/held/no-show/closed, setter, cash collected | |
| `lead_thread` | channel (IG/WhatsApp/email), contact, intent score, last inbound, last reply, response gap | |
| `affiliate` + `affiliate_code` | person, code, channel, agreement signed, last post link, orders, commission | Per-affiliate only |
| `stock_item` | SKU, on hand, run rate, days of cover, stack orders of cover | |
| `fulfilment` | order, paid at, fulfilled at, tracking present per component, hours to dispatch, carrier | |
| `ad_daily` | date, campaign, ad set, ad, spend, purchases and value (7-day click and incremental), CTR, CPM, frequency, review status | |
| `email_daily` | campaign/flow, recipients, revenue, revenue per recipient, bounce, spam | |
| `finance_txn` | from Leah's template (file 04) | |
| `payment_due` | payee, amount, due date, category, status, approved by | |
| `alert` | rule id, severity, fired at, payload, acknowledged, resolved | |
| `approval_request` | action, object ids, before, after, reach, reversible, specialist verdict, status, approved at, executed at, verification result | Full audit trail |
| `kpi_value` | person, kpi id, date, value, source, verified/recorded/calculated | Feeds the person scorecards |
| `change_event` | object, type (budget edit, new ad, price change, stock-out), date | Used to split averages before/after a change |
| `content_asset` | hub asset id, uploader, tags (file 07 section 4), creator licence, state, versions, brief, filming day | One row per piece of content |
| `post_card` | asset version, platform, account, scheduled time, caption, cover, compliance result, paid-boost flag, approval id, post url, status | One row per platform version |
| `post_metric` | post card, checkpoint (24h/72h/7d), platform metrics | Per post, never blended across platforms |
| `channel` | brand, platform, account, token expiry, publishing limit | Channel registry |

### 5. DASHBOARD PAGES

Mobile-first. Kane reads this on a phone. Black background, white text, one accent colour for actions. Every tile shows its data freshness time and its label (verified / recorded / calculated).

| # | Page | Top of page (the one line Kane reads) | Contents |
|---|---|---|---|
| 1 | **Command** | Yesterday: revenue by line, ad spend, aMER, contribution, cash balance | Open P1 alerts, decisions waiting for approval, today's calls, anything overdue |
| 2 | **Money** | Cash today and 14-day payments due | Cash by account, MTD P&L by business line, outgoings by category, payments due list, runway, variance vs last month |
| 3 | **Supplements** | Orders, net revenue, contribution yesterday | New vs returning, AOV, Stack orders, subscription count (mirror), discount rate, refunds, stock cover in stack orders, top SKUs |
| 4 | **Coaching programme** | Cash collected MTD vs target | Pipeline: DMs qualified > calls booked > held > closed > paid; per tier; Elite seats used of capacity; payments pending onboarding; per setter, never blended |
| 5 | **Training programme** | Active members and MRR | Joins/cancels, members by week of 8, check-ins today, silent members 3+ days, completions due in 14 days, leaderboard status, WhatsApp coach health |
| 6 | **Meta** | aMER and new-customer CAC vs break-even | Per ad set on 7-day click and incremental, Nathan ladder status (file 05), ad review issues, spend vs cap, change log overlay |
| 7 | **Email + DMs** | Revenue per send, DM response gap | Klaviyo campaigns and flows, flow status, deliverability; lead threads waiting, high-intent unanswered |
| 8 | **Fulfilment** | % UK orders dispatched within 24h | Open unfulfilled, oldest order age, component tracking gaps, international orders (handled in-house) |
| 9 | **Team** | Each person's scorecard in one row | Leah, Lemoni, Indigo, Asim (files P1-P4); click through to KPI history |
| 10 | **Alerts + approvals log** | Open count | Every alert and approval, who approved, what executed, verification result |
| 11 | **Content** | Posted yesterday and scheduled next 48h, per account | Calendar with gaps, pipeline by state and age, awaiting Kane, per-post performance at 24h/72h/7d, best performers by type, product and concept (file 07) |

### 6. CALCULATED METRICS (DEFINITIONS)

| Metric | Formula |
|---|---|
| **aMER** | Total new-customer revenue ÷ total ad spend (all paid channels), per day and rolling 7 |
| **MER** | Total revenue ÷ total ad spend |
| **Contribution** | Net revenue − COGS − shipping and labels − payment fees − ad spend |
| **New-customer contribution** | Same, restricted to first orders |
| **Blended CAC** | Total ad spend ÷ new customers |
| **Break-even ROAS / aMER** | Calculated from live COGS, fees and fulfilment cost. **Never hardcode it.** Kane signs off COGS; the dashboard shows the calculation inputs |
| **Stock cover** | On hand ÷ 7-day run rate, shown in days and in Complete Stack orders (limited by the scarcest component) |
| **Dispatch time** | Fulfilment timestamp − payment timestamp, working hours UK |
| **Revenue per send** | Klaviyo attributed revenue ÷ recipients |
| **DM response gap** | Share of high-intent inbound threads with no reply inside the reply window |

### 7. WHAT NOT TO BUILD

- No write paths to subscriptions (Kaching, Loop) of any kind.
- No new GHL or n8n workflows. Anything that must happen inside GHL is a request to Indigo.
- No automatic payment, refund, discount or ad change, ever. Organic social posts publish on schedule only after Kane approves each post (file 07 section 7).
- No automation of Premiere Pro itself. Editing state is tracked through Frame.io.
- No reliance on Triple Whale (cancelled) or on Meta-reported ROAS as the money truth. Money truth: bank (cash), Shopify and Stripe (revenue), Meta API direct (spend).

---

# PART 02

## 02. CTO AGENT SPECIFICATION

### 1. IDENTITY AND MANDATE

The CTO agent works directly for Kane. It is his operator across the whole business.

**Its job, in Kane's words, turned into duties:**

| # | Duty | What it produces |
|---|---|---|
| D1 | Analyse every part of the business stats and sales | Daily numbers by business line, with the reason behind each movement |
| D2 | Review everyone's individual position | Daily scorecard check for Leah, Lemoni, Indigo, Asim; weekly written review per person |
| D3 | Report back to Kane daily | The morning report on Telegram (file 03) |
| D4 | Review emails | Triage of the inboxes: urgent, needs Kane, needs Leah, needs Lemoni, noise. Drafts replies; never sends without approval |
| D5 | Flag anything urgent instantly | Telegram alerts from email, Instagram DMs, sales, Meta, email flows, systems, cash, stock, calls (file 03) |
| D6 | Analyse outgoings against revenue | Daily cash and P&L position from Leah's template plus live revenue (file 04) |
| D7 | Advise on supplier payments | A financial-position brief each time a supplier payment comes to Kane (file 04 section 5) |
| D8 | Keep the Meta strategy on track | Reads against Nathan's build ladder; recommendations cite it (file 05) |
| D9 | Training programme daily check-in | Member health, silent members, completions due, coach health |
| D10 | Weekly prompts to Kane | Monday reminder to build the affiliate management structure, with Lemoni's scorecard attached |
| D11 | Kane's daily to-do list | 07:30 list in a fixed structure that changes only for priority appointments, P1 incidents or tier 1-2 items (file 03 section 6) |
| D12 | Weekly rhythm | Sunday 12:00 planning session agenda from Lemoni's report; Monday content planning pack; Wednesday and Sunday filming blocks protected (file 03 section 5) |
| D13 | Supervise content | Content strategy and the pipeline run under a separate social media manager agent (file 07 section 13). The CTO runs the independent compliance check on final renders, scores that agent, reports content daily, and publishes only post cards Kane approved |

### 2. VOICE AND OUTPUT

- Short, plain, decision-led. Every report ends with what Kane should decide.
- Numbers first, then the reason, then the recommendation.
- Every number carries its label: verified, recorded, calculated.
- Per-unit, never blended: per ad set, per affiliate, per setter, per SKU.
- UK English. No hype. No exclamation marks. No em-dashes.

### 3. POWERS

| Level | Allowed | Examples |
|---|---|---|
| **Read** | Always, no approval | Every source in file 01 section 3 |
| **Analyse and draft** | Always, no approval | Reports, email reply drafts, ad change proposals, Klaviyo fixes, supplier-payment briefs, quote batches |
| **Write** | Only after: (1) specialist check, (2) Kane taps Approve on Telegram, (3) execution, (4) verification read-back | Pause an ad, send an email reply, post the approved quote batch, create a Gmail label |
| **Never** | Not even with approval via the agent | Move money, issue refunds, change subscriptions, edit Indigo's workflows, change commission rates, delete data |

### 4. THE APPROVAL FLOW (BUILD EXACTLY THIS)

```
Agent drafts action
   -> Specialist check (a separate, read-only model call with the checker prompt below)
   -> Telegram message to Kane:
        WHAT:        one line
        REACH:       people / records / money affected
        REVERSIBLE?: yes / no (if no, stated plainly first)
        OBJECT:      ids, field, before value -> after value
        CHECK:       specialist verdict + what else it touches + rollback
        [Approve]  [Reject]  [Ask a question]
   -> Approve: single-use token, expires in 24h, bound to that exact action payload
   -> Execute
   -> Verification read-back: confirm the change landed and nothing else moved
   -> Telegram confirmation with the verification result
```

**Rules:**
- High-reach or irreversible actions (any send to a list, any bulk edit, anything touching customers or money) show WHAT, REACH, REVERSIBLE in bold at the top.
- One Approve = one action. A batch only exists if the agent presents it as a named batch and Kane approves it as a batch.
- Organic social posts: every finished post card goes to Kane; his approval schedules it and it publishes at its slot (file 07 section 7).
- If the specialist check cannot run, the action waits. It is never skipped.
- If the payload changes after approval, the approval is void.
- Approvals are only accepted from Kane's Telegram user ID.

**Specialist checker prompt must answer five questions:**
1. Is this action correct against the data and the rules in this pack?
2. What else does this field or object touch?
3. What breaks downstream?
4. What is the exact rollback?
5. Does it touch subscriptions (Kaching, Loop, selling plans, contracts, sign-up)? Show evidence. If it cannot show "no", the action is not sent to Kane.

### 5. HARD RULES THE AGENT CHECKS BEFORE EVERY RECOMMENDATION

| Rule | Check |
|---|---|
| **Aggregation** | Did anything material change inside the window (new ad, budget change over ~20%, audience edit, stock-out, tracking issue)? If yes, split before/after and state which figure is the decision signal. A blended figure across a change is context, never a verdict |
| **Signal stability** | Before any scale recommendation: how many clean days since the last material change? Minimum 2-3 consecutive days post-learning. Otherwise the call is HOLD |
| **Rule conflict** | If a locked rule governs the area, quote it before proposing anything that conflicts with it |
| **Loophole** | A technical distinction that lets a hard rule be bypassed ("pausing is not editing") is itself a red flag. Stop and surface it |
| **Risk timing** | Risk is stated before Kane approves, never after |
| **Compliance** | No hormone/testosterone/TRT claims in Meta drafts. Health complaints escalate |
| **Meta direction** | Meta recommendations follow Nathan's build ladder (file 05) and cite the layer. Not the agent's own theory |
| **One thing at a time** | Decisions are presented one item at a time in priority order, not as a dump |

### 6. PRIORITY LADDER (HOW THE AGENT ORDERS WORK)

| Tier | Type | Example |
|---|---|---|
| 1 | Live money faults | Checkout down, payment failing, billing on the wrong interval, spend running uncapped |
| 2 | Hard stops with a date | Payment due, compliance deadline, stock running out |
| 3 | Conversion of traffic already paid for | Unanswered high-intent DMs, broken landing page, flow stopped |
| 4 | Acquisition | Meta ladder work, new creative |
| 5 | New surfaces | New products, new channels |

Nothing at a lower tier is pushed to Kane while a higher-tier item is open, except in the daily report's "for information" section.

### 7. MODEL AND IMPLEMENTATION

| Item | Specification |
|---|---|
| Surface | Anthropic Claude API with tool use, hosted in the app. Use the SDK's tool runner so per-turn hooks enforce the approval gate. (Anthropic Managed Agents with scheduled deployments is an acceptable alternative if you prefer hosted sessions; the approval flow stays in the app either way) |
| Model | `claude-opus-5` for the CTO agent and the specialist checker, adaptive thinking on |
| High-volume triage | Email and DM classification can run on a cheaper model tier only if Kane approves the cost trade-off; start on `claude-opus-5` at low effort and measure |
| Refusal handling | Check `stop_reason` before reading content; enable the server-side fallback parameter |
| Tools exposed to the agent | Warehouse SQL (read-only role), document store (this pack + locked rules), Telegram send-to-Kane, create_approval_request, and one execute tool per approved write type that only runs with a valid approval token |
| Context | System prompt = this pack's rules (stable, cached). Daily data passed as tool results, not pasted into the system prompt |
| Memory | Daily report, decisions and approvals stored in the warehouse; the agent reads the last 14 days of its own decisions each morning so it does not re-raise closed items |
| Logging | Every model call, tool call, approval and execution logged with request ids |

### 8. WHAT ONLY KANE DOES

- Every approval.
- Prices, offers, commission rates, discounts.
- Budget ceilings and scale decisions on Meta.
- Hiring, firing, contracts.
- Anything to do with subscriptions.
- Final say on any conflict between this pack and reality.

---

# PART 03

## 03. ALERTS, DAILY REPORT AND CADENCE

All times Dubai (GMT+4) unless stated. UK operating hours for store rules: 08:00-23:00 UK time.

### 1. SEVERITY LEVELS

| Level | Delivery | Meaning |
|---|---|---|
| **P1** | Instant Telegram message to Kane | Money, customers, compliance or a system is broken now |
| **P2** | Telegram digest every 2 hours during 08:00-22:00 Dubai | Needs attention today |
| **P3** | Daily report only | For information |

Quiet hours 23:00-07:00 Dubai: only P1 items marked **wake** break through. Everything else queues for 07:00.

Every alert shows: what happened, the number, the source, when, who owns it, the recommended next step, and a link to the dashboard record. Each alert type fires once per incident, then updates the same thread; no repeated spam.

### 2. INSTANT TRIGGERS (Kane's list, 15 Sep 2026)

Thresholds marked **(confirm)** are starting values. The system stores every threshold as editable config, never in code.

#### 2.1 Revenue
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| R1 | Store gone quiet | No Shopify order for 4 hours inside UK 08:00-23:00 **(confirm)** | P1 wake | Kane |
| R2 | Revenue behind | By 18:00 UK, today's net revenue below 50% of the trailing 4 same-weekday average **(confirm)** | P2 | Kane |
| R3 | Training programme joins stopped | No new training programme payment for 48 hours **(confirm)** | P2 | Kane |

#### 2.2 Payments
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| PY1 | High-ticket payment landed | Stripe payment matching an Analysis, Performance, Pro or Elite price | P1 | Kane + Leah. Message states "manual onboarding required", because these payments trigger no automation |
| PY2 | Payment failed | Stripe payment or subscription renewal failed | P2 (P1 if coaching tier) | Leah |
| PY3 | Dispute / chargeback | Stripe dispute created or Shopify chargeback | P1 wake | Kane + Leah |
| PY4 | Refund over cap | Any refund above £50, or any refund issued by a staff account outside Leah | P1 | Kane |
| PY5 | Billing interval mismatch | A plan's billing interval contradicts its name (e.g. a "3 month" plan billing monthly) | P1 | Kane (read-only flag, subscriptions are no-touch) |

#### 2.3 Meta
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| M1 | Ad or account problem | Ad disapproved, ad account restricted or disabled, page restricted | P1 wake | Kane |
| M2 | Meta payment failed | Billing failure on the ad account | P1 wake | Kane |
| M3 | Spend over cap | Daily spend pacing above the approved daily ceiling by 15% **(confirm)** | P1 | Kane |
| M4 | Below break-even | Ad set 3 clean days below calculated break-even on both 7-day click and incremental, with no change event inside the window | P2 | Kane |
| M5 | Fatigue | Cold ad set frequency above 2 over 7 days, or CTR down 30% vs its own first clean week, minimum £30 spend **(confirm)** | P3 | Kane |

#### 2.4 Leads and customers
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| L1 | High-intent DM unanswered | Instagram or WhatsApp thread asking about price, programme, Pro, Elite, results or booking, with no reply after 60 minutes in 09:00-22:00 Dubai **(confirm)** | P1 | Kane (setter team) |
| L2 | Booked call at risk | Calendly booking in the next 24h with no confirmation reply, or a cancellation | P2 | Lemoni + Kane |
| C1 | Complaint | Email, DM or review with anger, refund demand, "scam", "not arrived" | P2 (P1 if repeated, public, or from a coaching client) | Leah |
| C2 | Health or adverse reaction | Any mention of a reaction, side effect, illness, medical condition linked to a product | **P1 wake, always** | Kane. No reply is sent on the substance until Kane decides |
| C3 | Legal or regulatory | Trading Standards, ASA, MHRA, FSA, HMRC, solicitor, "legal action" | P1 wake | Kane |

#### 2.5 Systems
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| SY1 | Site or checkout down | Uptime check fails twice in a row on home, product, cart or checkout start | P1 wake | Kane |
| SY2 | Training site or booking link down | `train.` subdomain, booking link or Calendly page fails twice | P1 | Kane |
| SY3 | Escalation Router failed | n8n Escalation Router execution error | P1 | Indigo + Kane |
| SY4 | Other workflow errors | Any n8n workflow with 3+ failed executions in an hour | P2 | Indigo |
| SY5 | Connector stale | Any data source not refreshed for 3x its schedule | P2 | Roosevelt |

#### 2.6 Klaviyo
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| K1 | Flow stopped | Any flow that was live changes to draft/manual/paused | P1 | Kane |
| K2 | Send returned nothing | Campaign to 1,000+ recipients with £0 attributed revenue after 24h | P2 | Kane |
| K3 | Deliverability | Bounce rate above 2% or spam complaints above 0.1% on a send **(confirm)** | P1 | Kane |
| K4 | Two big sends in 24h | Two sends to the full list inside 24 hours scheduled | P1 (before it goes) | Kane |

#### 2.7 Cash
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| CA1 | Balance warning | Revolut Business GBP balance below £10,000 **(confirm)** | P2 | Kane + Leah |
| CA2 | Balance critical | Below £5,000 **(confirm)** | P1 | Kane + Leah |
| CA3 | Payment due, cash short | A payment due in the next 7 days exceeds projected cash after committed outgoings | P1 | Kane |
| CA4 | Template missing | Leah's daily template not received by 13:00 Dubai | P2 | Leah |

**Note:** until the Revolut API is connected (phase 5), cash alerts can only run once a day, when Leah's template lands. The alert says so.

#### 2.8 Stock
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| ST1 | Low cover | Any SKU below 30 days of cover, or Complete Stack below 30 days in stack orders | P2 | Kane |
| ST2 | Critical cover | Below 14 days | P1 | Kane |

Stock alerts inform reorder timing. They do not block sends or pause ads.

#### 2.9 Calls (Calendly)
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| CL1 | New booking | Any call booked on Kane's calendar | P2 (P1 if inside 24h) | Kane + Lemoni |
| CL2 | Cancellation / reschedule | | P2 | Kane + Lemoni |
| CL3 | Reminder | 15 minutes before each call, with the prospect brief | P1 | Kane |
| CL4 | Tomorrow's call list | 20:00 Dubai, every call for tomorrow with a one-line brief each | Scheduled | Kane + Lemoni |
| CL5 | No-show | Call time + 10 minutes with no join | P2 | Lemoni chases |

#### 2.10 Important Google emails
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| E1 | Important sender | From Stripe, Shopify, Meta, Klaviyo, Google, Revolut, HMRC, Companies House, suppliers, the fulfilment partner, coaching clients, affiliates about money | P2 (P1 if it contains payment failure, suspension, legal, deadline within 48h) | Kane or the owner named in the classification |
| E2 | Needs a reply from Kane | Classifier marks it as needing Kane personally | P2 | Kane. Draft reply attached |

#### 2.11 Training programme
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| T1 | Daily check-in | 09:00 Dubai: active members, check-ins logged yesterday, members silent 3+ days (named), members by week of 8, completions due in 14 days, leaderboard freshness, WhatsApp coach health | Scheduled P3 in report, P2 if silent members exceed 20% **(confirm)** | Kane |
| T2 | Completion approaching | Member reaches week 6 of 8 | P2 | Kane (renewal conversation) |
| T3 | Motivation quote to the WhatsApp group | Daily post at a fixed time **(confirm time)**. See section 4 | Scheduled send | Kane approves weekly batch |

#### 2.12 Weekly prompt
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| W1 | Affiliate management structure | Every Monday 09:00 Dubai: reminder to Kane to build and review the affiliate management structure, with Lemoni's scorecard and her open decisions attached | Scheduled | Kane |

#### 2.13 Content studio (file 07)
| ID | Trigger | Rule | Level | Owner |
|---|---|---|---|---|
| CT1 | Upload not tagged | Content in `UPLOADED` for 24h | P2 | Uploader (Kane or Lemoni) |
| CT2 | Post awaiting Kane | Every finished post card is sent to Kane with preview and flags; reminder 12h before its slot | P2 | Kane |
| CT3 | Compliance fail | Any FAIL on a final render; health or hormone claim FAIL shown with timecode | P2 (P1 if it was scheduled) | Editor + Kane |
| CT4 | Publish failed | Platform rejected, errored, or token expired at publish time | P1 | Roosevelt + Kane |
| CT5 | Post live | Published and URL read back | P3 (report) | Kane |
| CT6 | Calendar gap | A planned slot for tomorrow has no scheduled post by 18:00 Dubai | P2 | Social media manager agent proposes a replacement post card to Kane |
| CT7 | Platform strike | Post removed, account warning, violation or strike on any platform | P1 wake | Kane |
| CT8 | Token expiring | Any channel token expires within 7 days | P2 | Roosevelt |
| CT9 | Publish limit | Account within 80% of its live publishing limit | P2 | Kane |
| CT10 | Negative comment spike | Negative or complaint comments on a post above 3x the account's normal rate within 2h **(confirm)**; account auto-paused | P1 | Kane |
| CT11 | Plan not agreed | No Weekly Posting Plan agreed by Monday 18:00 Dubai; slots for the week are not set until it is | P2 | Kane |
| CT12 | Tomorrow's posts digest | 20:00 Dubai, the approved posts going out tomorrow, with [Hold] per post | Scheduled | Kane |

### 3. THE DAILY REPORT (TELEGRAM, 08:00 DUBAI, confirm time)

Fixed order. Fits on a phone screen per section. Full detail links to the dashboard.

```
TFP DAILY | Tue 16 Sep | data as of 07:45

1. MONEY LINE
   Revenue yesterday: Supplements £x | Coaching £x | Training £x | Total £x
   Ad spend £x | aMER x.xx (break-even x.xx) | Contribution £x
   Cash (from Leah's template, date): £x | Due next 7 days: £x

2. OPEN URGENT (P1 not yet resolved)
   - one line each, owner, age

3. SUPPLEMENTS
   Orders x (new x / returning x) | AOV £x | Stack orders x | Refunds £x
   Stock: lowest cover SKU x days

4. COACHING PROGRAMME
   Calls booked x | held x | closed x | cash collected £x | MTD £x vs target
   Payments awaiting onboarding: x

5. TRAINING PROGRAMME
   Active x | joins x | cancels x | MRR £x | silent 3+ days x | completions in 14 days x

6. META (Nathan ladder: Layer x)
   Per ad set: spend, 7-day click ROAS, incremental ROAS, change events
   Ladder exit criteria outstanding: x

7. EMAIL + DMS
   Klaviyo revenue per send £x | flows live x/x
   High-intent DMs waiting x | response gap x%

8. FULFILMENT
   UK dispatched within 24h: x% | open unfulfilled x | oldest x hours

9. TEAM
   Leah: template on time Y/N | CS backlog x | payments due current Y/N
   Lemoni: calls confirmed x/x | referral approvals pending x | register %
   Indigo: workflow failures 24h x | escalation router OK Y/N
   Asim: 24h dispatch x% | component gaps x

10. CONTENT
    Posted yesterday: IG x | TikTok x | Shorts x | YouTube x
    Scheduled next 48h x | awaiting Kane's approval x | in edit x | Weekly Posting Plan agreed Y/N
    Best post last 7 days: account, views, follows

11. DECISIONS FOR KANE TODAY (max 3, in ladder order)
    For each: WHAT | MONEY/REACH | REVERSIBLE? | RECOMMENDATION | CHECK
    [Approve] [Reject] [Ask]
```

Rules for the report:
- If a section has no change and no issue, it collapses to one line: "no change".
- Numbers that span a change event show before/after, not a blend.
- The report never contains customer personal data beyond first name and order number.

### 4. MOTIVATION QUOTES TO THE TRAINING PROGRAMME WHATSAPP GROUP

This is a send to customers, so it is gated:
1. Every Sunday 18:00 Dubai, the agent drafts 7 quotes for the week in TFP's voice (disciplined, confident, no hype, no health or body-transformation claims, no banned words: "secret", "miracle", "hack", "trick", "literally", "honestly", no exclamation marks, no em-dashes).
2. Kane receives the batch on Telegram, can edit or strike any quote, and approves the batch as a named batch.
3. Approved quotes post daily at the confirmed time.
4. Sending into the WhatsApp group runs through GHL, which Indigo owns: the send mechanism is agreed with Indigo before build (either she exposes a send endpoint, or the app uses the GHL conversations API with her notified). Roosevelt does not create a GHL workflow himself.
5. If a batch is not approved, nothing posts.

### 5. WEEKLY AND MONTHLY CADENCE

| When | What | To |
|---|---|---|
| Saturday 20:00 **(confirm)** | Lemoni's weekly report due (affiliate scorecard, blockers, content needs, Kane's week ahead). CTO checks it landed and pre-reads it | Kane |
| **Sunday 12:00** | **Planning session with Kane, based on Lemoni's report.** CTO sends an agenda at 11:00: her scorecard per affiliate, blocked items with her recommendation, CTO's week-ahead priorities by ladder tier, calendar conflicts | Kane + Lemoni |
| **Sunday** | **Filming day** (block protected on the to-do list) | Kane |
| Sunday 18:00 | Quote batch for approval | Kane |
| **Monday** | **Content strategy planning day: Weekly Posting Strategy Review.** Social media manager agent leads with the review pack (file 07 section 7.1); CTO adds results, compliance trends, what the Meta ladder needs from creative (file 05 Layer 3), affiliate content in hand. Kane agrees the Weekly Posting Plan | Kane + social media manager agent + CTO |
| Monday 09:00 | Affiliate structure reminder (W1) + weekly person reviews: one short written review each for Leah, Lemoni, Indigo, Asim against their scorecards | Kane |
| Monday 09:00 | Week-on-week business summary by line | Kane |
| **Wednesday** | **Filming day** (block protected on the to-do list) | Kane |
| 1st of month | Month P&L by business line, outgoings by category vs previous month, per-affiliate net contribution, per-setter conversion | Kane |

### 6. KANE'S DAILY TO-DO LIST (CTO-PROMPTED, FIXED STRUCTURE)

Kane needs a daily to-do list from the CTO that follows a fixed structure. **The structure only changes for priority appointments or major issues, based on importance to the business.**

#### 6.1 Delivery
Telegram, 07:30 Dubai **(confirm)**, before the daily report. Also pinned on the dashboard Command page, with tick-off buttons. Ticks are stored so the next day's list carries anything unfinished.

#### 6.2 The fixed weekly shape

| Day | Theme | Protected block |
|---|---|---|
| Monday | Content strategy planning | Content planning block **(confirm time)** |
| Tuesday | Business and sales | Decisions + calls |
| Wednesday | Filming | Filming block **(confirm time)** |
| Thursday | Business and sales | Decisions + calls |
| Friday | Business and sales | Decisions + calls + week close |
| Saturday | Light day | Lemoni's report lands |
| Sunday | Planning + filming | 12:00 planning session on Lemoni's report; filming block **(confirm time)** |

#### 6.3 The fixed daily structure (every list uses this order)

```
TFP TO-DO | Wed 17 Sep | Theme: FILMING

1. APPROVALS (from the 08:00 report)       max 3, ladder order
2. TODAY'S FIXED BLOCK                       e.g. Filming 10:00-13:00 (protected)
3. APPOINTMENTS                              calls from Calendly, with one-line brief each
4. TOP 3 BUSINESS PRIORITIES                 ladder tier 1 -> 5, each with owner, why, done-when
5. TEAM FOLLOW-UPS                           what Kane owes Leah / Lemoni / Indigo / Asim today
6. CARRIED OVER                              unfinished items from yesterday, with days open
CHANGES TODAY: none  |  or: "Filming moved 10:00 -> 14:00 because [P1 checkout down]"
```

#### 6.4 The adjustment rule (build it as logic, not as model judgement)

The CTO may change the fixed structure **only** for:

| Allowed reason | Example | What it can move |
|---|---|---|
| **A priority appointment** | A near-close coaching call, an Elite client call, a supplier, bank, legal or regulator meeting | Shifts a block, never deletes a filming or planning day without Kane's tap |
| **A P1 incident** | Checkout down, Meta account restricted, cash critical, health complaint | Inserts the incident at the top; shifts blocks |
| **A tier 1 or tier 2 ladder item** | Live money fault, a hard stop due today | Replaces a lower-tier priority in section 4 |

Everything else (new ideas, non-urgent requests, P2/P3 alerts) queues to the next free slot, not today's structure.

Every change is stated on the list with the reason. If a protected block (filming, planning) would be moved or cancelled, the CTO asks Kane on Telegram first: **[Move it] [Keep block]**.

---

# PART 04

## 04. FINANCE FEED, P&L AND SUPPLIER PAYMENT BRIEF

### 1. PRINCIPLE

**Money truth:** bank for cash, Shopify and Stripe for revenue, Meta API direct for ad spend. Leah is connected to the bank. She fills one fixed template every day. The system reconciles her figures against Stripe and Shopify automatically and flags any gap. No figure in the P&L is typed twice.

### 2. LEAH'S DAILY TEMPLATE

**File:** `leah-daily-finance-template.csv` (in this pack).
**Name each day's file:** `TFP-finance-YYYY-MM-DD.csv` (the date the figures cover, which is yesterday).
**Deadline:** uploaded by 12:00 Dubai (09:00 UK). Alert CA4 fires at 13:00 if missing.
**Where:** upload page on the dashboard, or send the file to the Telegram bot (Leah's Telegram ID allow-listed for uploads only, no other bot powers).

#### 2.1 Columns (fixed, in this order)

| # | Column | Allowed values / format | Required |
|---|---|---|---|
| 1 | `date` | YYYY-MM-DD, the day the transaction cleared or the balance was read | Yes |
| 2 | `row_type` | `BALANCE`, `IN`, `OUT`, `DUE` | Yes |
| 3 | `account` | `REVOLUT_GBP`, `REVOLUT_AED`, `REVOLUT_EUR`, `REVOLUT_USD`, `STRIPE`, `SHOPIFY_PAYMENTS`, `PAYPAL`, `OTHER` | Yes |
| 4 | `business_line` | `SUPPLEMENTS`, `COACHING`, `TRAINING`, `SHARED` | Yes for IN/OUT/DUE |
| 5 | `category` | See 2.2 | Yes for IN/OUT/DUE |
| 6 | `counterparty` | Supplier, platform or payer name. Customers: write `CUSTOMER`, never a personal name | Yes for IN/OUT/DUE |
| 7 | `amount` | Positive number, 2 decimals, no currency symbol, no commas | Yes |
| 8 | `currency` | `GBP`, `AED`, `EUR`, `USD` | Yes |
| 9 | `reference` | Bank reference, invoice number or Stripe payout id | Yes for IN/OUT |
| 10 | `status` | `CLEARED`, `PENDING` (for IN/OUT); `DUE`, `SCHEDULED`, `OVERDUE` (for DUE) | Yes |
| 11 | `due_date` | YYYY-MM-DD, DUE rows only | DUE rows |
| 12 | `approved_by` | `KANE`, `LEAH`, or blank if not yet approved | OUT and DUE rows |
| 13 | `notes` | Free text, one line, no personal data | No |

**Rules:**
- One `BALANCE` row per account, every day, even if unchanged.
- Transfers between TFP's own accounts use category `INTERNAL_TRANSFER` on both sides and are excluded from P&L.
- Every `DUE` row stays on the template, updated each day, until it is paid (then it appears as an `OUT` row with the same `reference`).
- Customer payouts from Stripe and Shopify arrive as `IN` rows with category `PAYOUT_STRIPE` or `PAYOUT_SHOPIFY`. The system matches them to platform payout ids.

#### 2.2 Category list (fixed)

| Group | Categories |
|---|---|
| **Income** | `PAYOUT_SHOPIFY`, `PAYOUT_STRIPE`, `PAYOUT_TIKTOK`, `OTHER_INCOME`, `REFUND_RECEIVED` |
| **Cost of goods** | `COGS_SUPPLIER`, `PACKAGING`, `INBOUND_FREIGHT`, `CUSTOMS_DUTY` |
| **Fulfilment** | `FULFILMENT_PICKPACK`, `POSTAGE_LABELS`, `INTERNATIONAL_SHIPPING` |
| **Marketing** | `ADS_META`, `ADS_TIKTOK`, `ADS_GOOGLE`, `AFFILIATE_COMMISSION`, `CREATOR_GIFTING`, `CONTENT_PRODUCTION` |
| **Software** | `SOFTWARE_SHOPIFY`, `SOFTWARE_KLAVIYO`, `SOFTWARE_GHL`, `SOFTWARE_N8N`, `SOFTWARE_AI`, `SOFTWARE_OTHER` |
| **People** | `TEAM_PAY`, `CONTRACTOR` |
| **Programme delivery** | `DNA_BLOODWORK_TESTS`, `COACH_DELIVERY` |
| **Finance** | `PAYMENT_FEES`, `LOAN_REPAYMENT`, `BANK_FEES`, `FX_FEES`, `CUSTOMER_REFUND`, `CHARGEBACK` |
| **Tax + admin** | `VAT`, `CORPORATION_TAX`, `ACCOUNTANCY_LEGAL`, `INSURANCE`, `OTHER_ADMIN` |
| **Other** | `INTERNAL_TRANSFER`, `UNCATEGORISED` (must be under 5% of OUT value in a month) |

**Access note:** the `TEAM_PAY` and `CONTRACTOR` rows are visible to Kane's role only on the dashboard.

#### 2.3 Validation on upload (the system rejects or flags)

| Check | Result |
|---|---|
| Wrong columns, wrong order, unknown category or account | Rejected, Leah told exactly which row and why |
| Missing BALANCE row for an account seen in the last 30 days | Flag |
| Stripe/Shopify payout IN row does not match a platform payout within ±£1 and ±2 days | Flag to Leah |
| OUT row above £50 with `approved_by` blank or `LEAH` for a supplier category | Flag to Kane |
| Duplicate reference | Flag |
| Personal name in counterparty or notes | Rejected |

### 3. P&L LOGIC

Built daily, shown MTD and trailing 30, by business line.

| Line | Source |
|---|---|
| Gross revenue | Shopify orders (supplements), Stripe charges (coaching, training) |
| Discounts | Shopify discount allocations (split: code-based vs subscription automatic) |
| Refunds + chargebacks | Shopify and Stripe |
| **Net revenue** | Calculated |
| COGS | Shopify variant cost × units (supplements); DNA/bloodwork and delivery costs from template (coaching) |
| Fulfilment + postage | Template + Shopify label costs |
| Payment fees | Stripe and Shopify fee data |
| **Gross margin** | Calculated |
| Ad spend | Meta API direct (not the bank line, which bills in arrears every 2-3 days). The bank row is used only to reconcile |
| Affiliate commission, gifting | Template |
| **Contribution** | Calculated |
| Software, people, admin, finance costs | Template, spread evenly across the month for monthly bills |
| **Operating profit** | Calculated |

**Allocation of SHARED costs across lines:** by share of net revenue that month, shown as a separate allocated row so the unallocated view is always available.

**Break-even figures are calculated from these inputs, never typed in.** Kane signs off COGS. Until he does, the dashboard marks break-even as "calculated, COGS pending sign-off".

### 4. CASH VIEW

| Tile | Definition |
|---|---|
| Cash today | Sum of latest BALANCE rows, converted to GBP at the day's rate (rate source stated) |
| Committed next 7 / 14 / 30 days | DUE + SCHEDULED rows by due date |
| Expected in next 7 days | Stripe and Shopify pending payouts |
| Projected cash | Cash today + expected in − committed out |
| Runway | Projected cash ÷ trailing 30-day average net daily burn (only shown if burn is negative) |

### 5. SUPPLIER PAYMENT BRIEF (Kane's rule: suppliers go to Kane, CTO advises)

Every time a supplier payment is requested (a `DUE` row in a supplier category, or an email invoice detected), the CTO sends Kane this brief on Telegram:

```
SUPPLIER PAYMENT: [counterparty] | £[amount] | due [date]
What for:           [invoice ref, what it buys, SKU/stock it covers]
Cash position:      today £x -> after this payment £x -> projected 14 days £x
Other dues in 14d:  £x across x payments
P&L position:       MTD contribution £x (line: supplements/coaching/training)
Stock context:      cover on affected SKUs x days (if stock purchase)
Risk if delayed:    [stock-out date / late fee / supplier terms]
Recommendation:     PAY NOW / PAY ON DUE DATE / PART-PAY / HOLD, with one-line reason
[Approve for Leah to pay]  [Hold]  [Ask]
```

After Kane approves, Leah makes the payment. The CTO never does. The next day's template must show the matching `OUT` row. If it does not by the due date, alert.

**Refunds:** Leah approves refunds up to £50. Above £50 goes to Kane with the order, reason and customer history.

---

# PART 05

## 05. META STRATEGY: NATHAN PERDRIAU / BLUE SENSE, WHERE WE ARE

### 1. WHAT THE STRATEGY IS

On 13 September 2026 Kane adopted Nathan Perdriau (Blue Sense Digital) as the knowledge base and direction for the Meta account. The CTO agent's Meta recommendations follow Nathan's order and cite the layer. They are never the agent's own theory.

**Kane's meaning of "build":** execute Nathan's strategy from the foundation up, **inside the existing campaigns and ad sets**. Not a rebuild. No new campaigns without Kane's explicit instruction.

**Nathan's order:** data integrity is the base, creative sits on it, account structure sits on creative. Offer ranks above creative and structure; budget is the smallest lever. **No layer goes live until the layer below meets its exit criteria.**

### 2. THE BUILD LADDER

| Layer | Name | Exit criteria | Status (15 Sep 2026) |
|---|---|---|---|
| 0 | Diagnose before changing | For each ad set, "underperforms because [metric] dropped, driven by [sub-metric], caused by [trigger]" can be completed from data | **Complete** |
| 1 | Data integrity | Daily dashboard reads aMER, contribution, new-customer contribution, new-customer revenue, new-customer orders, blended CAC; existing customers excluded from cold ad sets; Klaviyo-to-Meta customer sync working; COGS populated in Shopify; creative enhancement settings confirmed | **Current. Not met** |
| 2 | Unit economics and offer | Each offer has a stated required ROAS and target CPA; its landing page is built and compliance-cleared | Drafting |
| 3 | Creative concepts | Each concept has 3-15 finished ads across top, middle and bottom of funnel, matched to its Layer 2 page | Drafting (concepts planned, not live) |
| 4 | Structure refresh inside existing ad sets | One concept per spending ad set; existing customers excluded; retargeting sized | Not started |
| 5 | Test and read | Each concept pass/fail: spend at least 3x (ideally 5x) target CPA over ~7-14 days, KPI at ad set level on 7-day click, incremental as second validation | Blocked until Layer 2 sets target CPA |
| 6 | Scale and budget | Scale only a passed concept, 20% steps per day on an ad set hitting KPI, within the approved ceiling, signal stability stated first | Not started |
| 7 | Iterate and refresh | Replicate winners, new hooks, rework failing angles first | Not started |

#### 2.1 Layer 1 detail (this is what your build directly unblocks)

| Item | State |
|---|---|
| Pixel / Conversions API healthy | Met (verified 13 Sep) |
| Landed costs locked, Shopify unit costs written for 16 products | Met, pending Kane's final COGS sign-off |
| **Daily aMER dashboard** | **Not built. Your dashboard page 6 and the money line in the daily report ARE this deliverable** |
| Existing customers excluded from cold ad sets | Not met |
| Klaviyo-to-Meta customer sync | Not working (frozen since 6 Apr, verified 13 Sep) |
| Bundle parent costs | Partly written; remainder on hold |
| Third-party automated rules on the account | Still active, to be reviewed |
| Advantage+ creative enhancements | Still on for two ads |

**The CTO agent tracks each row above as a checklist on the Meta page, with owner and date, and reports "Layer 1: x of y exit criteria met" in every daily report until Layer 1 closes.**

### 3. ACCOUNT STATE (recorded 14 Sep 2026, refresh live on build)

| Item | Value |
|---|---|
| Ad account | `act_1225520148676719` |
| Spending ad sets | Broad £75/day, Shilajit-Scale £50/day, 7-10 Batch £30/day |
| Total daily budget | £155/day across 2 campaigns; 25 live ads across 13 concepts |
| Approved ceiling | 7-day rolling average ceiling set by Kane (store as config) |
| Last 7 days to 13 Sep | aMER 1.43x; Meta 7-day click ROAS 0.70x; incremental 1.42x |
| 6-12 Sep by ad set (incremental) | Broad 1.67x, Shilajit-Scale 1.48x, 7-10 Batch 0.03x |
| Break-even | Calculated from live COGS (file 01 section 6). Do not hardcode |
| Planned concepts (not live) | Three core concepts in drafting |
| Strategy for the stack | The Complete Stack is the product, a free creatine tub is the offer. Stack ads point to the stack page, never a single product page |

**Material events inside recent windows** (log these as `change_event` rows so averages split correctly): 8 Sep pause of 13 ads.

### 4. THE £1,000/DAY TARGET GATE

Kane's scale target is £1,000/day of spend. The gate before moving toward it:
- Incremental ROAS at or above break-even for 2-3 consecutive clean days,
- Meta average basket above £95 over 7 days,
- At least 10 incremental purchases in the window.

The dashboard shows this gate as three pass/fail tiles on the Meta page. The CTO agent may not recommend a budget increase unless all three pass AND the signal-stability check passes.

### 5. METRICS THE DASHBOARD MUST CARRY FOR THIS STRATEGY

| Metric | Level | Attribution |
|---|---|---|
| aMER (new-customer revenue ÷ total ad spend) | Account, daily + 7-day rolling | Shopify first orders + Meta API spend |
| Contribution, new-customer contribution | Account | Calculated |
| New-customer revenue, new-customer orders | Account | Shopify |
| Blended CAC | Account | Calculated |
| ROAS, CPA, purchases, spend | Ad set | **7-day click AND incremental, side by side** |
| Amount spent per ad | Ad | Nathan's best ad-level proxy for what the algorithm favours |
| Frequency (cold), CTR, CPM | Ad set | Fatigue diagnosis |
| Average basket value | Account, 7-day | Gate check |
| Existing-customer share of spend | Ad set | Exclusion check |

### 6. HOW THE CTO AGENT MAY ACT ON META

- Reads freely. Reports per ad set, never blended.
- Every recommendation names the ladder layer and the exit criterion it serves.
- Every proposed change (pause, activate, budget, creative swap, audience edit) goes through the approval flow in file 02 section 4, with the specialist check and the aggregation and signal-stability checks stated.
- No attribution-setting changes on live ad sets.
- Never kill an ad on ad-level ROAS inside an ad set that is hitting its KPI.
- Compliance: no hormone, testosterone or TRT claims in any Meta ad or caption draft.

---

# PART 06

## 06. BUILD PHASES AND ACCEPTANCE TESTS

Each phase ends with a demo to Kane and his sign-off. A phase is done when it is **live and producing the output**, not when the code is written.

### PHASE 0: FOUNDATION (no real data)
**Build:** Step 0 in file 00 complete. App skeleton on Vercel, auth with 2FA, Postgres schema from file 01 section 4, seeded with dummy data, Telegram bot locked to Kane's chat ID, audit log table.
**Acceptance:**
- [ ] Signed contractor agreement confirmed by Kane.
- [ ] Access register sent; unneeded access removed.
- [ ] Login requires 2FA; a second account without a role sees nothing.
- [ ] Telegram bot ignores messages from any user other than Kane (and Leah for uploads only).

### PHASE 1: MONEY AND META TRUTH (unblocks Nathan Layer 1)
**Build:** Read connectors for Shopify, Stripe, Meta; Command, Money (revenue side), Supplements and Meta pages; aMER, contribution, new-customer metrics, blended CAC; ad set table on 7-day click and incremental; change-event log; Layer 1 checklist tiles; £1,000/day gate tiles.
**Acceptance:**
- [ ] Yesterday's Shopify net revenue on the dashboard matches a manual Shopify Analytics read within £1.
- [ ] Meta spend per ad set matches Ads Manager for the same day within £1.
- [ ] Each ad set shows 7-day click and incremental side by side.
- [ ] Break-even is calculated from inputs, and the inputs are visible.
- [ ] A test change event splits a 7-day average into before/after on screen.

### PHASE 2: DAILY REPORT, ALERTS, TO-DO LIST
**Build:** Scheduler; daily report (file 03 section 3); daily to-do list (file 03 section 6); P1/P2/P3 engine with editable thresholds; revenue, payments, Meta, systems (uptime, n8n status), Calendly and stock triggers; quiet hours.
**Acceptance:**
- [ ] Report arrives at the set time for 5 consecutive days with no manual step.
- [ ] Each trigger in file 03 section 2 has been test-fired once (dummy or sandbox event) and delivered at the right level.
- [ ] A repeated incident updates one thread instead of sending duplicates.
- [ ] Changing a threshold on the dashboard changes behaviour without a deploy.
- [ ] To-do list arrives before the report and only changes for the reasons in file 03 section 6.

### PHASE 3: FINANCE FEED AND P&L
**Build:** Leah's upload (dashboard + Telegram file), validation, reconciliation to Stripe/Shopify payouts, full P&L by business line, cash view, payments due, supplier payment brief, refund-over-cap alert.
**Acceptance:**
- [ ] A template with a wrong category is rejected with the row number and reason.
- [ ] A payout IN row reconciles to its Stripe/Shopify payout automatically.
- [ ] A DUE supplier row produces the supplier payment brief on Telegram with all fields populated.
- [ ] Team pay rows are invisible to non-Kane roles.

### PHASE 4: PEOPLE, PROGRAMMES, INBOXES, DMS
**Build:** Person scorecards (files P1-P4); Team page; Coaching and Training programme pages; GHL connector; Gmail triage with draft replies; Instagram/WhatsApp lead threads and response gap; Klaviyo connector and triggers; training programme daily check-in; weekly person reviews.
**Acceptance:**
- [ ] Each scorecard KPI shows its source and label; KPIs with no data source show "not measurable yet" rather than a guess.
- [ ] A test high-intent DM left unanswered fires L1 at 60 minutes.
- [ ] A test email mentioning a side effect fires C2 as P1 and no draft reply is offered on the substance.
- [ ] Coaching payment test fires PY1 with "manual onboarding required".
- [ ] Customer identity never merges two people on name alone.

### PHASE 5: CTO AGENT ACTIONS AND THE REMAINING FEEDS
**Build:** CTO agent with tool use; specialist checker; approval flow with single-use tokens and verification read-back; quote batch flow (agreed with Indigo); Revolut Business API read for live cash alerts; Monday affiliate-structure prompt.
**Acceptance:**
- [ ] A proposed Meta pause shows WHAT, REACH, REVERSIBLE, before/after, specialist verdict and rollback, and does nothing until Approve.
- [ ] An approval token cannot be reused, expires after 24h, and is void if the payload changes.
- [ ] After an approved action, the verification read-back result is posted to Telegram.
- [ ] A proposed action touching a subscription is blocked at the checker and never reaches Kane.
- [ ] Quote batch posts nothing unless the batch was approved.

### PHASE 6: CONTENT STUDIO (file 07)
**Start on day one of this phase, because they take longest:** Meta app review for Instagram publishing, TikTok Content Posting API audit, YouTube API project audit.
**Build:** Frame.io V4 connection and webhooks; phone upload page; tagging with licence lookup from the affiliate register; workflow states; edit brief template with the house editing rules; compliance check (transcript + on-screen text OCR + caption); post cards, calendar and approval (single and named batch); publish adapters (audited provider first, direct APIs after audit) with read-back; performance pulls; Content page; CT1-CT12 alerts. Optional: GPT-6 Astra rough-cut pilot on an isolated machine, only if Kane approves.
**Acceptance:**
- [ ] Kane uploads a 4K vertical clip from his phone and Lemoni uploads a creator clip; both appear in the hub and the app within 5 minutes.
- [ ] Creator content without a signed licence cannot move past `TAGGED`.
- [ ] A Frame.io comment on the edit appears on the content record, and a version that passes QC moves to `COMPLIANCE` without Kane.
- [ ] A test render with a burned-in hormone claim fails compliance with the timecode shown.
- [ ] Every finished post card reaches Kane with preview, captions, slot, compliance result and flags; nothing schedules without his approval.
- [ ] Approving a card schedules it and it publishes at its slot with no further action; approving several at once records a named batch listing every card.
- [ ] Each flag in file 07 section 7.5 shows on the card when triggered (test each one); a compliance FAIL and a missing consent or licence cannot be approved with one tap.
- [ ] Editing the caption or file after approval voids the approval and resends the card; a card not approved before its slot does not post.
- [ ] Pause all posting stops every scheduled post within 1 minute; per-account pause works.
- [ ] `approval_mode` is `every_post` on every account, and autopilot cannot be switched on except by Kane under the file 07 section 7.7 thresholds.
- [ ] One approved post each publishes to Instagram, TikTok, YouTube Shorts and YouTube, and the live URL is read back and stored.
- [ ] An expired token at publish time fires CT4 instead of skipping silently.
- [ ] 24h metrics land on the Content page per post.
- [ ] Editor knowledge base structured (file 07 section 12), published to the editor, and pulled into every CTO brief.
- [ ] Each quality-checklist item maps to an automated check or is marked manual.
- [ ] Social media manager agent produces a Monday plan pack, a filming shot list and an edit brief, and has no publish tool.
- [ ] The CTO's compliance check runs independently of the social media manager agent's drafts, and the CTO scores that agent on the section 13.3 measures.

### DEFINITION OF DONE (WHOLE BUILD)

Kane opens Telegram at 07:30 and has his to-do list; at 08:00 the report; he makes his decisions with a tap; every urgent problem reached him within minutes; he opens one dashboard page to see any part of the business; and every number on it can be traced to its source.

### HANDOVER REQUIREMENTS

- Repository owned by a TFP account, not a personal one.
- Every credential in TFP's name, rotatable without Roosevelt.
- Runbook: how to add a threshold, add a data source, rotate a key, restore the database.
- Monthly running-cost estimate (hosting, database, Claude API, Telegram) stated before phase 5.

---

# PART 07

## 07. CONTENT STUDIO: UPLOAD, EDIT, REVIEW, SCHEDULE, PUBLISH

**Added 15 Sep 2026.** A module inside the same app and warehouse. Content goes from Kane's phone or Lemoni's upload, through editing in Premiere Pro, through QC against the editor knowledge base and a compliance check, to Kane for approval, onto a posting calendar set by the Weekly Posting Plan agreed each Monday, and out to Instagram, TikTok, YouTube Shorts and Kane's YouTube channel. Performance comes back into the dashboard.

### 1. THE FLOW

```
 UPLOAD            TAG             EDIT                 REVIEW          CHECK          SCHEDULE          PUBLISH         LEARN
 Kane phone   ->  type, product, -> Premiere Pro via  -> QC vs KB      -> compliance -> post card per  -> IG / TikTok -> 24h / 72h / 7d
 Lemoni           people, creator,  Frame.io panel      in Frame.io     (speech +      platform:        Shorts /        metrics back
 (Hany later)     platforms, brief  (optional AI rough  (timecoded)     on-screen      file, caption,   YouTube         to dashboard
                                    cut, section 5)                     text + caption) time, account    (verified URL)
                                                                                         [Kane approves each post]
```

### 2. MEDIA HUB: FRAME.IO (RECOMMENDED)

| Why Frame.io | Detail |
|---|---|
| Native to Premiere Pro | The Frame.io panel in Premiere Pro (out of beta for Premiere Pro 25.6) lets the editor browse and import media into bins, share sequences for feedback, and see review comments sync back as timeline markers |
| Phone upload | Kane and Lemoni upload from the Frame.io mobile app, or from the dashboard's upload page, which sends files to Frame.io through the API |
| Review | Frame-accurate QC comments on each version; Kane can look and comment from his phone if he chooses, but is not required to |
| Automation | Frame.io V4 API and webhooks (asset uploaded, comment added, status changed) drive the workflow states in the app |
| Build note | **Build on the V4 API only.** Frame.io's V2 API endpoints are scheduled for removal on 1 December 2026. V4 uses OAuth 2.0 via Adobe Developer Console |

**Alternative if Kane does not want Frame.io:** the app stores media itself (resumable multipart upload to object storage, since phone 4K video files are large). The editor then downloads and re-uploads by hand, with no Premiere integration and no timecoded review. Roosevelt prices both options before phase 6.

**Existing Google Drive folders** stay as the archive. New intake goes to the hub.

### 3. WORKFLOW STATES (EVERY PIECE OF CONTENT HAS EXACTLY ONE)

| State | Entered when | Owner | Moves on when |
|---|---|---|---|
| `UPLOADED` | File lands in the hub | Uploader | Tagged |
| `TAGGED` | Required tags complete (section 4) | Uploader | Kane or the editor accepts it into the plan |
| `IN_PLAN` | Matched to a slot in the approved Weekly Posting Plan | Social media manager agent | Edit brief locked |
| `BRIEF_LOCKED` | Format, length, arc, shot order, captions and platforms set from the editor knowledge base before the first render | Social media manager agent | Sent to the editor |
| `IN_EDIT` | Editor working in Premiere Pro | Editor | Version shared back |
| `IN_QC` | Version shared to Frame.io; automated checks + knowledge base checklist | CTO / system | Pass, or fail to `CHANGES` |
| `CHANGES` | QC or compliance failed, with reasons | Editor | New version shared |
| `EDIT_APPROVED` | QC passed | System | Compliance runs |
| `COMPLIANCE` | Independent compliance check (section 6) | CTO | Pass, or fail to `CHANGES` |
| `READY` | Compliance passed; captions, titles, cover drafted; flags checked (section 7.5) | Social media manager agent | Sent to Kane |
| `AWAITING_KANE` | Post card sent to Kane with preview and flags (every post) | Kane | Approved, caption edited, sent back to editor, or rejected |
| `SCHEDULED` | Kane approved the post card | System | Publish time |
| `PUBLISHED` | Platform confirms, post URL verified by read-back | System | Metrics collection |
| `FAILED` | Platform rejected or errored | Roosevelt / Kane | Fixed and re-approved |
| `ARCHIVED` | Not used, or retired | Kane | |

### 4. UPLOAD AND TAGGING

**Who uploads:** Kane (phone), Lemoni (creator and affiliate content). Hany can be added later with the same upload page.

**Required tags before content leaves `UPLOADED`:**

| Tag | Values |
|---|---|
| Content type | Talking head, Q&A, B-roll, training footage, product, creator/affiliate UGC, testimonial, podcast/long-form |
| Brand | TFP, Kane personal |
| Product or programme | Complete Stack, single SKU, coaching programme, training programme, none |
| People on camera | Kane, team member, creator (named from the affiliate register), member of the public |
| Creator licence | For creator content: agreement signed with a content and likeness licence, **Y required**. Pulled from Lemoni's affiliate register, not typed |
| Intended platforms | Instagram, TikTok, YouTube Shorts, YouTube long-form |
| Linked brief or calendar slot | Optional at upload, required by `IN_PLAN` |
| Filming day | Wednesday, Sunday, other |

**Rules:**
- Creator content without a signed licence cannot move past `TAGGED`.
- Content showing a customer or member of the public needs a recorded consent flag.
- Files keep their original quality. The system never recompresses the master.
- iPhone vertical footage often carries rotation metadata. Probe the metadata before any crop or reformat.

### 5. EDITING

#### 5.1 Primary path: the editor in Premiere Pro
Editing is in-house. The CTO sends each piece of content to TFP's editor with its locked brief; the editor imports from the Frame.io panel, edits in Premiere Pro, and shares the sequence back to Frame.io for review. The app tracks state from Frame.io webhooks. It does not try to automate Premiere itself.

**House editing rules (the edit brief template carries these):**
1. **Never re-frame Kane's talking-head.** Keep his exact frame. No crop, zoom or matte on his face.
2. **Edit from Kane's cut.** Grade and punch-ins go on his file; never rebuild the sync.
3. **Lock the brief before the first render:** format, arc, shot order, voice-over.
4. **Tight-cut style** for spoken clips: off-message content removed, captions on, pace tightened to the target length.
5. **Verify by transcribing the rendered file**, not the cut list, so no clipped words or repeated sentences survive.
6. Deliverables per platform: 9:16 vertical for Reels, TikTok and Shorts; 16:9 for YouTube long-form; captions burned in or supplied as a file per platform.

#### 5.2 Optional pilot: GPT-6 Astra as a rough-cut assistant
**What it is (public reports, not tested by TFP):** OpenAI's GPT-6 Astra can control a computer and a browser. Creators report using it through the Codex desktop app to plan, script, cut and render videos, and to drive editing software. One creator reported a full video took about 50 minutes and about $60 of API cost.

**How it fits, if Kane approves a pilot:**

| Rule | Why |
|---|---|
| Rough cuts only: b-roll sequences, creator UGC compilations, reformatting non-face footage, caption drafts | Kane's talking-head and final edits stay with the human editor under the house rules |
| Runs on an isolated machine or user account with **no logged-in social, bank, email or store accounts** | It controls the computer; it must not reach anything it could post, buy or send from |
| Works on copies pulled from the hub; output goes back to the hub as a draft version | Nothing it makes skips QC or the compliance check |
| Never publishes, never schedules | Publishing only happens through section 7 |
| Creator footage only with a licence that allows processing by third-party AI tools | Licence and data terms |
| Cost logged per video against the edit it replaced | Kane decides after a 10-video pilot whether it earns its cost |

The CTO agent itself stays on Claude (file 02). Astra would be a separate editing tool, billed separately.

### 6. COMPLIANCE CHECK (BEFORE ANYTHING IS SCHEDULED)

Runs automatically on `EDIT_APPROVED`. Reviews the final rendered file, not the draft.

| Check | How |
|---|---|
| Spoken claims | Transcribe the audio |
| On-screen text and burned-in captions | OCR sampled frames. **Burned-in captions carrying claims were missed before; this check is mandatory** |
| Caption, title, description, hashtags | Text check |
| Claims register | No hormone, testosterone or TRT claims on anything that may be boosted as a Meta ad. No disease or medical claims anywhere. Supplement claims only as permitted in TFP's claims register |
| Platform rules | TikTok is stricter on supplements and has open policy violations on the TFP account; TikTok posts get the strictest check |
| Creator licence | Confirmed from the register |
| Result | PASS, or FAIL with timecode and the exact words or frame. A health-claim FAIL is never overridable by the editor, only by Kane |

A post card also carries a **"paid boost allowed: Y/N"** flag, so organic content with owned-channel-only language is never turned into a Meta ad.

### 7. WEEKLY POSTING PLAN, KANE'S POST APPROVAL AND SCHEDULING

**Kane's operating model (confirmed 15 Sep 2026):** Kane uploads content. It is edited, quality-checked, compliance-checked and captioned without him. **Every finished post then comes to Kane. If he is happy with it, it goes onto the schedule and posts automatically at its slot across the platforms.** Strategy, themes and slots are agreed once a week in the posting strategy review.

#### 7.1 Weekly Posting Strategy Review (Monday, content planning day)
**Attendees:** Kane, the social media manager agent (leads), the CTO agent (results, compliance, risks). Run as a dashboard session with the pack on screen, or on Telegram.

**Review pack (social media manager agent prepares it, delivered before the planning block):**
1. Last week per account: results at 24h, 72h and 7 days; what to replicate, iterate or drop.
2. Strategy for the week: themes, content pillars, content mix per account, posting times and frequency per platform.
3. The slot plan: every slot per account per day, with content type and theme, and the specific content already in the pipeline where known.
4. Caption and call-to-action rules for the week (any offer mentioned must match a live store or programme offer).
5. Flag settings (7.5), and any changes proposed.
6. Risks: account warnings, compliance trends, token expiries, publish limits.

**Output: the Weekly Posting Plan (`WPP-YYYY-Www`).** It sets the strategy, slots and caption rules for the week. Kane agrees it on Telegram. **The plan does not publish anything by itself.** Every post still comes to Kane for approval (7.4). The first Monday of each month includes a strategy reset.

#### 7.2 What happens after Kane uploads
1. Kane uploads from his phone. The social media manager agent tags it and matches it to a slot in the plan.
2. The social media manager agent writes the edit brief from the editor knowledge base; the CTO sends content and brief to the editor.
3. The editor edits in Premiere Pro and shares the version back through Frame.io.
4. **QC:** automated checks (transcript against brief, Kane's framing unchanged against source, format, duration, logo, captions) plus the editor's knowledge base checklist. A fail goes back to the editor with reasons, not to Kane.
5. **Compliance check** by the CTO, independent of the social media manager agent (section 6).
6. The social media manager agent drafts captions, titles, hashtags and cover per platform, within the plan's caption rules.
7. **The finished post card is sent to Kane** (7.4).
8. Kane approves: the post is scheduled into its slot, publishes automatically, the live URL is read back, metrics are collected.

#### 7.3 Post cards
Each platform version is its own post card:

```
POST CARD  |  Instagram Reel  |  @account  |  Thu 18 Sep 18:30 UK
File:        v3 final, 0:42, 9:16  [preview]
Caption:     [draft, editable]
Hashtags:    [editable]
Cover:       [frame 00:03]
Compliance:  PASS (speech, on-screen text, caption)  |  Paid boost allowed: N
Flags:       none
Brief:       Complete Stack / Session Three concept / WPP-2026-W38
[Approve & schedule]  [Edit caption]  [Send back to editor]  [Reject]
```

One piece of content usually produces several cards (Reel, TikTok, Short). Kane can approve them together from one screen.

#### 7.4 Kane's approval
- **Every finished post card goes to Kane** on Telegram and the dashboard as soon as it is ready, with the video preview, caption per platform, slot, compliance result and flags.
- **[Approve & schedule]** puts it on the schedule. It then publishes automatically at its slot with no further action.
- Kane can approve several cards at once ("Approve selected"). The system records that as a named batch listing every card approved.
- **[Edit caption]** lets Kane change the caption and approve in one step. **[Send back to editor]** requires a reason tag (framing, pacing, captions, brand, compliance, other), which feeds the knowledge base loop.
- Any change to the file, caption, account or time after approval voids that approval and resends the card.
- A reminder goes 12 hours before the slot (CT2). A card not approved before its slot does not post; the social media manager agent proposes the next free slot.

#### 7.5 Flags shown on the approval card
These do not block Kane's approval, except where stated; they make the risk visible before he taps.

| Flag | Why |
|---|---|
| Compliance result is anything other than a clean PASS | Health, hormone and medical claims. **A FAIL goes back to the editor first and cannot be approved with one tap; a health-claim FAIL needs Kane's explicit typed confirmation** |
| Content type, account or slot is not in the Weekly Posting Plan | Off-plan |
| A price, discount, offer or code that does not match a live store or programme offer | Wrong offers reaching customers |
| Health, medical, body-transformation or results claims, or before/after imagery | Claims risk |
| A customer or member of the public on camera without recorded consent, or creator content without a verified licence | Consent and licence. **Cannot be approved until consent or licence is recorded** |
| A competitor named or shown | Past ad disapprovals on comparison content |
| QC flags Kane's talking-head framing changed, or the transcript does not match the brief | House editing rules |
| The platform account is under a warning, strike or restriction | Account safety (TikTok especially) |
| The CTO rates it a reputational risk (controversial topic, personal matter, a named person) | Judgement call |

#### 7.6 Controls
- **Daily 20:00 Dubai digest:** the approved posts going out tomorrow, each with **[Hold]**.
- **Kill switch:** **[Pause all posting]** on Telegram and the dashboard, plus a pause per account.
- **Auto-pause:** the scheduler pauses an account by itself and alerts Kane on a platform strike or removal (CT7), a spike in negative comments (CT10), or two consecutive publish failures on that account.
- **No silent failures:** an expired token or rejected publish alerts (CT4); it never skips quietly.

#### 7.7 Approval mode (config per account)
- `approval_mode = every_post` on every account. **This is the default and Kane's confirmed setting (15 Sep 2026).**
- An `autopilot` mode (posts inside the agreed weekly plan that pass every flag check schedule without per-post approval) may be built as a switched-off capability. It can only be switched on by Kane himself, per account, and only after at least 2 weeks on `every_post` with 95%+ first-pass compliance and no rejected posts. Nothing in the system switches it on automatically.

**Posting calendar:** slots per account per day are set in the Monday review. Wednesday and Sunday filming fills them, and Sunday 12:00 planning pulls in Lemoni's creator content.

### 8. PUBLISHING INTEGRATIONS (VERIFY LIVE AT BUILD; THESE CHANGE)

| Platform | API | Constraints to design for (from current public documentation and reports, Sep 2026) |
|---|---|---|
| **Instagram** (Reels, posts, carousels, stories) | Instagram Graph API content publishing, professional accounts linked to a Facebook Page, `instagram_content_publish` permission via Meta app review | Rolling 24h publishing cap per account. Published figures vary (25, 50, 100), so read the live `content_publishing_limit` endpoint per account; never hardcode it. Container creation is not throttled; publish is |
| **TikTok** | TikTok Content Posting API, Direct Post (`video.publish` scope) | **Until TikTok audits the app, API posts are private (SELF_ONLY), limited to 5 posting users per 24h, and the account must be set to private while posting.** Posts made before audit stay private after it. The audit needs a demo video of the full flow. Upload-to-drafts mode (creator finishes posting in the TikTok app) is the fallback |
| **YouTube Shorts + Kane's YouTube channel** | YouTube Data API v3 `videos.insert`; YouTube Analytics API | **Uploads from unverified API projects are private until the project passes Google's audit.** Upload calls sit in their own quota bucket (default 100 per day). Shorts are vertical uploads under the Shorts length limit |

**Recommended route:**
1. **Start the Meta app review, TikTok audit and YouTube audit on day one of phase 6.** They are the longest-lead items.
2. **Until audits pass**, publish through an already-audited social publishing API provider. Roosevelt proposes two, with price, data handling terms and which platforms and formats they support. Kane chooses. The app's post cards, approvals and calendar stay the same, and only the publish adapter changes later.
3. Each platform is an adapter behind one interface (`publish(post_card) -> post_url`), so moving from a provider to the direct APIs changes nothing upstream.
4. After publishing, **read the post back** from the platform and store the live URL. `PUBLISHED` is only set after the read-back succeeds.

### 9. CHANNEL REGISTRY (CONFIG, KANE CONFIRMS THE LIST)

| Brand | Platform | Account | Notes |
|---|---|---|---|
| TFP | Instagram | TFP brand account | Its token must be reconnected (known expired) |
| Kane personal | Instagram | Kane's account | Confirm |
| TFP | TikTok | TFP account | Open policy violations on record; strictest compliance tier |
| Kane personal | TikTok | Kane's account | Confirm if in scope |
| Kane personal | YouTube | Kane's channel: Shorts + long-form | Confirm whether TFP also has a channel |

Tokens belong to TFP-owned developer apps and are stored in the secret store. Token expiry is monitored (CT8).

### 10. PERFORMANCE (BACK INTO THE DASHBOARD)

| Platform | Metrics pulled at 24h, 72h and 7 days |
|---|---|
| Instagram | Plays/views, reach, likes, comments, shares, saves, follows from post, profile visits |
| TikTok | Views, likes, comments, shares (plus watch-time metrics where the API exposes them) |
| YouTube | Views, watch time, average view duration, retention, subscribers gained, likes, comments |

**Dashboard page 11, Content:** calendar (scheduled, published, gaps), pipeline by state with age, awaiting Kane, per-post performance, and best performers by content type, product and concept, **per post and per account, never blended across platforms**. Links from each post to the Meta creative it became, if boosted, and to DM spikes on the day it posted.

### 11. PEOPLE IN THE CONTENT FLOW

| Person | Role in the studio |
|---|---|
| Kane | Films, uploads from phone, runs the Monday posting strategy review, approves each finished post before it is scheduled |
| Lemoni | Uploads and tags creator/affiliate content; licence confirmed from her register (people/02-LEMONI.md, role C) |
| Editor (in-house) | Receives content and the locked brief from the CTO, edits in Premiere Pro, shares back for review |
| Hany | Videographer; uploads added later if Kane wants |
| Social media manager agent | Runs content strategy and the pipeline day to day (section 13): plan drafts, briefs to the editor, captions, calendar, performance reads |
| CTO agent | Supervises the social media manager agent, runs the independent compliance check, reports content in the daily report, enforces approvals |
| Roosevelt | Builds the module and the editor knowledge base structure; never posts |

### 12. EDITOR KNOWLEDGE BASE (REQUIRED DELIVERABLE. STRUCTURE BELOW IS SUGGESTED; ROOSEVELT FINALISES AND BUILDS IT)

**This must be built before in-house editing runs through the platform.** The structure is Roosevelt's call; the existence of the knowledge base, the non-negotiables in section 2 and the link to the automated checks are not optional.

**Why it is needed:** editing is now in-house, and the CTO hands content to the editor remotely. The editor works from what arrives with the file. TFP's past content failures were editing failures: Kane's talking-head re-framed, sync rebuilt instead of editing from his cut, clipped words and repeated sentences surviving to the final render, rendering before the brief was locked, iPhone rotation errors, a cropped logo, and a burned-in testosterone caption that went out. The rules that prevent these exist, but in scattered documents the editor cannot see.

**Design principle:** one knowledge base, two readers. The editor follows it; the CTO agent writes briefs from it and checks renders against it. If the brief and the check use the same source, they cannot disagree.

#### 12.1 Suggested structure

| # | Section | Contents |
|---|---|---|
| 1 | How work arrives | What the CTO sends (clips, locked brief, platforms, deadline, reference examples), importing through the Frame.io panel, naming, how and where to hand back, turnaround expectations |
| 2 | Non-negotiables | Never re-frame Kane's talking-head (no crop, zoom or matte on his face); edit from Kane's cut, grade and punch-ins on his file; brief locked before first render; verify by transcribing the rendered file, not the cut list |
| 3 | House cut style | Tight-cut rules for spoken clips (remove off-message content, captions on, pace to target length); method for multi-clip long-form and sales videos (clip order, section titles, no clipped word endings, no repeated sentences) |
| 4 | Platform formats | Reels, TikTok, Shorts 9:16; YouTube long-form 16:9; lengths, safe zones, caption placement, cover frames, export settings per platform |
| 5 | Brand look | Fonts, colours, caption style, logo usage (only the complete silver wordmark file; the other logo files are cropped), grade/LUT, lower thirds, end cards. **Colour rule to confirm with Kane before build:** records disagree between a gold accent and a locked design using warm black, bone and silver with orange used only for calls to action |
| 6 | Compliance for editors | Words and on-screen text that cannot appear (hormone, testosterone, TRT and medical claims), TikTok strict tier, creator licence rule, what the automatic check will fail and why |
| 7 | Footage handling | iPhone rotation metadata (probe before any crop or reformat), masters never recompressed, versioning (v1, v2...), where masters and exports live |
| 8 | Quality checklist before hand-back | A tick list that mirrors the CTO's automated checks: frame untouched, no clipped words, transcript matches brief, captions correct, logo correct, format and length correct, no restricted words on screen |
| 9 | Premiere starter kit | Project template, export presets per platform, caption style templates (Essential Graphics), logo and font files, grade preset |
| 10 | Examples | Approved reference edits per content type, and past mistakes with what was wrong |

#### 12.2 Suggested build

- **Stored** as versioned documents in the app (source of truth) and published to the editor as a read-only page plus the starter kit files in the Frame.io hub.
- **Linked into every brief:** the CTO's brief template pulls the relevant sections (for example talking-head rules plus Reels format) so the editor never has to search.
- **Wired to the checks:** each non-negotiable and checklist item maps to an automated check where one is possible (transcript check, OCR for restricted words, aspect ratio, duration, face framing unchanged against the source).
- **Change control:** only Kane approves changes to sections 2, 5 and 6. Every change is dated and the CTO uses the new version from the next brief.
- **Feedback loop:** every `CHANGES` round in review is tagged with a reason (framing, pacing, captions, brand, compliance). Repeated reasons are surfaced to Kane weekly as knowledge base updates to make.

#### 12.3 Source material Kane provides to Roosevelt

TFP's existing editing and brand rules (house tight-cut style, multi-clip long-form method, talking-head framing rule, edit-from-cut rule, brief-lock rule, vertical footage rotation note, visual identity, logo asset notes, claims and Meta ad policy rules). Kane sends these as documents; Roosevelt structures them into the sections above.

### 13. SOCIAL MEDIA MANAGER AGENT (RECOMMENDED STRUCTURE)

**Recommendation:** content strategy and the content pipeline sit with a dedicated **social media manager agent**, which reports to the CTO agent. The CTO does not run content itself.

**Why a separate agent:**
1. **Different job.** The CTO oversees the whole business and reports. Content strategy is daily creative and planning work (calendar, briefs, captions, hooks, repurposing, performance reads) that would crowd the CTO's context and attention.
2. **No marking its own homework.** The agent that plans and captions content should not also pass it. The CTO runs the compliance check and scores the social media manager independently.
3. **Clean handover points.** The social media manager proposes, the CTO checks and reports, and Kane approves.

#### 13.1 What the social media manager agent owns
| # | Duty | Output |
|---|---|---|
| S1 | Monday content strategy planning pack | Draft weekly plan per account: themes, content types, slots, what Wednesday and Sunday filming must capture, affiliate content to use (from Lemoni) |
| S2 | Filming shot lists | Shot list for each filming day, sent to Kane the day before |
| S3 | Edit briefs | Locked brief per piece, built from the editor knowledge base; sends content and brief to the editor |
| S4 | Captions, titles, hashtags, covers | Drafts per platform on every post card |
| S5 | Calendar | Leads the Monday posting strategy review, presents the Weekly Posting Plan, sends finished post cards to Kane, schedules approved posts into slots, flags gaps (CT6) |
| S6 | Repurposing | One source clip becomes Reels, TikTok, Shorts and long-form cut-downs where it fits |
| S7 | Performance reads | Per post and per account at 24h, 72h and 7 days; what to replicate, iterate or drop, never blended across platforms |
| S8 | Hook testing | Trial reels to pre-test hooks before creative goes to paid Meta (feeds Meta ladder Layer 3, file 05) |
| S9 | Knowledge base feedback | Proposes editor knowledge base updates from repeated review change reasons |

#### 13.2 What it does not own
Agreeing the Weekly Posting Plan and approving every post (Kane), the QC and compliance verdicts (CTO), paid Meta ads (Meta ladder, Kane), creator deals (Lemoni and Kane), editing itself (the editor).

#### 13.3 How the CTO supervises it
| CTO check | Measure |
|---|---|
| Plan on time | Monday pack delivered before the planning block |
| Calendar filled | % of planned slots with a scheduled post 24h before the slot |
| Brief quality | Review rounds per piece and the tagged change reasons (framing, pacing, captions, brand, compliance) |
| Compliance first-pass rate | % of final renders passing the check first time |
| Results | Per-account follows, views and saves trend; posts that fed a winning Meta creative |

#### 13.4 Build notes
- Same Claude API setup as the CTO agent (file 02 section 7), with its own system prompt and a narrower tool set: content tables, Frame.io, the editor knowledge base, caption drafting, and the platform insights reads. **No publish tool.** Publishing runs only from the scheduler, for post cards Kane approved.
- Its creative guidance for anything intended for paid ads follows the creative doctrine used in the Meta ladder (Kane provides it).
- It reports into the CTO's daily report section 10 (Content), not separately to Kane, except the Monday plan and the batch approval.

---

# PART P1

## LEAH MOUSAH: HEAD OF CUSTOMER SERVICE, OPERATIONS AND FINANCE OPERATOR

**Reports to:** Kane
**Authority:** Secondary approver. Escalates major financial and high-risk items to Kane.
**Name note:** spelled L-E-A-H. Voice notes sometimes transcribe her as "Leo" or "Lira"; it is the same person.

### 1. EXACT POSITION

Leah runs the operational and financial back office. She is the person connected to the bank, the owner of the Stripe account, and the first line of customer service.

#### 1.1 Owns (if it fails, it is hers)
| # | Owns | In practice |
|---|---|---|
| O1 | **Daily finance template** | Uploads `TFP-finance-YYYY-MM-DD.csv` by 12:00 Dubai every day (file 04) |
| O2 | **Bank and payment accounts access** | Revolut Business and Stripe. Owner of the Stripe account; creates restricted read keys for the build |
| O3 | **Payments due** | Keeps every upcoming payment on the template as a DUE row until paid. Kane is told as dates approach, not after |
| O4 | **Making approved payments** | Pays suppliers only after Kane approves on the supplier payment brief |
| O5 | **Customer service** | The main customer inbox, order issues, follow-ups, returns |
| O6 | **Refunds up to £50** | Decides alone within the cap |
| O7 | **GHL platform account** | The account itself (billing, users). The automations inside it belong to Indigo |
| O8 | **High-ticket payment admin** | On a coaching payment alert, confirms the payment and records it so onboarding starts |

#### 1.2 Not hers
| Not hers | Whose |
|---|---|
| Any supplier payment decision | Kane (with the CTO's financial brief) |
| Refunds above £50 | Kane |
| Content of any kind | Kane |
| Prices, discounts, offers | Kane |
| GHL and n8n workflow edits | Indigo |
| Stock picking and dispatch | Asim (UK); international orders in-house |

### 2. SCORECARD (CTO checks daily, reviews weekly)

| # | KPI | Source | Target | Floor (flag) |
|---|---|---|---|---|
| K1 | Template on time | Upload timestamp | By 12:00 Dubai, 100% of days | Missed 2 days in a week |
| K2 | Template accuracy | Validation + payout reconciliation | 0 rejected uploads; 100% payouts reconciled | Any unreconciled payout older than 3 days |
| K3 | Uncategorised spend | Template | Under 5% of monthly OUT value | Above 10% |
| K4 | Payments due current | DUE rows vs bank OUT rows | 0 overdue payments | Any OVERDUE row |
| K5 | Customer service first response | Gmail thread timestamps | Within 24 hours, 100% | Any thread waiting 48h |
| K6 | Customer service backlog | Open threads needing reply | Under 10 at day end **(confirm)** | Above 20 |
| K7 | Refund discipline | Shopify + Stripe refunds | 100% of refunds within cap or Kane-approved | Any over-cap refund without approval |
| K8 | High-ticket payment admin | PY1 alert to payment recorded | Within 4 working hours **(confirm)** | Next day |

**Review rule:** every KPI is shown per day. A week summary is context, not a verdict.

### 3. WHAT THE CTO DOES FOR LEAH

- Confirms her template landed, and tells her exactly which rows failed validation.
- Sends her the P2 alerts she owns: payment failures, complaints, template missing, payout mismatches.
- Drafts customer service replies for her to review (she sends).
- Prepares the supplier payment brief to Kane, so Leah is not the one explaining cash position.

### 4. ESCALATION

| Situation | Route |
|---|---|
| Refund above £50 | Kane, via the dashboard request |
| Supplier asking for payment | DUE row + CTO brief to Kane |
| Customer health or adverse-reaction complaint | Kane immediately. No reply on the substance |
| Legal, chargeback, regulator | Kane immediately |
| Cash below warning level | Kane, with the payments due list |

### 5. DASHBOARD ACCESS (phase 4 roles)

Money upload page, customer service view, her own scorecard. No access to team pay rows, Meta, or other people's scorecards.

---

# PART P2

## LEMONI GROOTKERK: HEAD OF AFFILIATES AND PA TO KANE

**Reports to:** Kane directly.
**Two roles, both measured:** (A) Head of Affiliates, (B) Kane's PA for calendar, calls and reminders.

---

### ROLE A: HEAD OF AFFILIATES

#### A1. Exact position
Lemoni finds creators, gets them signed, gets them product, gets them posting, gets their content to the content team, and keeps a record that reconciles to Shopify and Stripe. She does not set the terms, spend the money, run the ads, or decide what ships.

**Two affiliate estates:**
| Estate | What | Tracking |
|---|---|---|
| **Supplements** | Creators promoting the Shopify store with their code or link, and creator assets used in Kane's paid ads | UpPromote (Shopify app) + Shopify discount codes |
| **Programme** | Creators referring sign-ups to the coaching/training programmes on a flat fee per sign-up | Stripe promotion codes |

#### A2. Owns
| # | Owns |
|---|---|
| O1 | Affiliate relationships end to end: sourcing, contact, onboarding, ongoing relationship |
| O2 | The affiliate register: every live code or link maps to a named, contactable person with a signed agreement |
| O3 | Collecting signed creator agreements before any code is issued or product ships |
| O4 | Stock sent to affiliates, logged before it ships (SKU, quantity, recipient, date) |
| O5 | Posting compliance: who agreed to post what, by when, and the chase when they did not |
| O6 | Sourcing affiliate content to the content team's brief |
| O7 | Triage of every UpPromote referral order within 48 hours |
| O8 | Programme promo codes in Stripe: create, pause, replace, assign within the standard structure |

#### A3. Not hers
Commission rates, the creator agreement terms, running or funding any ad, approving or making any payout, discounts outside the standard structure, deciding what content ships, pricing, stock levels, any product claim, exclusivity or cash deals. All of these go to Kane.

#### A4. Affiliate scorecard
| # | KPI | Source | Target | Floor |
|---|---|---|---|---|
| AK1 | Register integrity: % of live codes/links mapped to a named person with a signed agreement | Register vs Shopify + Stripe active codes | 100% | Below 90% |
| AK2 | Active affiliate rate: % of signed roster that posted this month, with a link as evidence | Register `last_post_link` | 60% monthly | Below 30% |
| AK3 | Referral approval SLA | UpPromote referral status | 100% within 48h | Any older than 5 days |
| AK4 | Stock variance: units logged vs units left stock for affiliates | Stock ledger vs Shopify | Zero | Any unlogged unit |
| AK5 | Per-affiliate net contribution: revenue − discount − commission − COGS − gifted stock − postage | Shopify + UpPromote + Stripe + ledger | Positive on every retained affiliate | Negative over 4 clean weeks with 5+ orders |
| AK6 | Per-affiliate payback ratio | Calculated from AK5 | 2.0x or better | Below 1.0x over 4 clean weeks with 5+ orders |
| AK7 | Content delivered to brief and accepted | Content team acceptance log | 100% of brief, on time | 2 weeks below 70% |

**Rules built into the scorecard:**
- **Per affiliate only.** A programme-wide ROI is context, never a verdict.
- **Minimum before judging an affiliate:** 4 consecutive clean weeks. Before scaling: 4 weeks AND 5+ attributable orders. Before cutting: 6 weeks with zero orders AND two documented chases. Below minimum = UNPROVEN, not failing.
- **Clock resets** on: a new or changed code, stock-out on their product, price change, a paid ad run behind their asset, a rate change, their account restricted, a site-wide promo undercutting their code.
- **Known measurement gaps** (show "not measurable yet", never a guess): paid-ad use of creator assets has no attribution link; repeat purchases are not attributable per affiliate; duplicate codes for one person split their revenue until merged.

#### A5. Weekly and Sunday rhythm
- **Sunday 12:00 Dubai: planning session with Kane based on Lemoni's report.** Lemoni's report is due by Saturday 20:00 Dubai **(confirm)** and contains: the scorecard per affiliate, what moved (signed, activated, posted, retired), what is blocked with her recommendation, what the content team needs next week, and Kane's calendar for the week ahead.
- **Monday 09:00:** the CTO reminds Kane to build and review the affiliate management structure, attaching her scorecard and open decisions.

---

### ROLE B: PA TO KANE (CALENDAR, CALLS, REMINDERS)

#### B1. Owns
| # | Owns |
|---|---|
| P1 | Kane's call calendar accuracy (Calendly and linked calendars) |
| P2 | Confirming every booked call 24 hours before (message to the invitee) |
| P3 | Tomorrow's call list with a one-line brief per call, to Kane by 20:00 Dubai |
| P4 | Chasing no-shows within 30 minutes and rebooking |
| P5 | Protecting the fixed weekly blocks (file 03 section 6): no calls booked into filming or planning blocks without Kane's say-so |
| P6 | Reminders Kane asks for, logged and delivered on time |

#### B2. PA scorecard
| # | KPI | Source | Target | Floor |
|---|---|---|---|---|
| PK1 | Calls confirmed 24h before | Calendly + message log | 100% | Below 90% |
| PK2 | Call list delivered by 20:00 | Telegram/Slack timestamp | 100% of working days | Missed twice in a week |
| PK3 | Show rate | Calendly held vs booked | 85% **(confirm)** | Below 70% |
| PK4 | No-shows chased within 30 min | Calendly + message log | 100% | Any unchased |
| PK5 | Calendar conflicts with fixed blocks | Calendar vs block schedule | 0 | Any unapproved conflict |

### ROLE C: CONTENT UPLOADS (CONTENT STUDIO, FILE 07)

#### C1. Owns
| # | Owns |
|---|---|
| U1 | Uploading creator and affiliate content to the hub the day it arrives |
| U2 | Tagging every upload fully (type, product, creator, intended platforms) within 24 hours |
| U3 | Confirming the creator's content and likeness licence is signed in the register before content is tagged ready |
| U4 | Bringing creator content in hand to the Sunday 12:00 planning session |

#### C2. Not hers
Editing, deciding what gets posted, captions, scheduling, approving or publishing posts.

#### C3. Upload scorecard
| # | KPI | Source | Target | Floor |
|---|---|---|---|---|
| UK1 | Uploads tagged within 24h | Content states | 100% | Any CT1 alert on her uploads twice in a week |
| UK2 | Creator content with licence confirmed | Tags vs register | 100% | Any creator upload without licence |
| UK3 | Creator content used: uploads that reach `PUBLISHED` within 30 days | Content states | Tracked per creator | Context only; which creators produce usable material |

### DASHBOARD ACCESS (phase 4 roles)
Affiliate pages, Kane's calendar view, the content upload page and her own uploads' status, her own scorecard. No finance, no Meta spend, no other person's scorecard, no post approval.

### OPEN FOR KANE (not for Roosevelt to decide)
Lemoni's standing money limits (recommended in the internal record, never confirmed; until confirmed, everything costing money is treated as needing Kane).

---

# PART P3

## INDIGO HADDINGTON: AUTOMATION AND AGENTIC FLOWS (EXTERNAL, INDIGO COLLECTIVE)

**Pronouns:** she/her
**Reports to:** Kane
**Relationship:** external automation partner

### 1. EXACT POSITION

Indigo builds and runs TFP's agentic flows: the automations inside GoHighLevel and the n8n workflows that connect Stripe, Shopify, GHL, WhatsApp and Instagram. The customer-facing AI agents run on her flows.

#### 1.1 Owns
| # | Owns | Examples |
|---|---|---|
| O1 | GHL automation: workflows, pipelines logic, triggers, calendars integration | Training programme onboarding, contact routing |
| O2 | n8n workflows she built | Order-to-GHL router, training programme onboarding, Escalation Router (safety-critical), leaderboard export, system alert, handoff to Leah |
| O3 | The WhatsApp AI coach for training programme members | Daily coaching conversations, escalations |
| O4 | Instagram agent flows | DM offer agent, comment agent, unanswered sweep, nurture ladder |
| O5 | Knowledge base and prompts for those agents, as amended and approved by Kane | Agent identity, pricing references |
| O6 | Change notes for every edit to her workflows | What changed, when, why |

#### 1.2 Not hers
| Not hers | Whose |
|---|---|
| The CRM dashboard and CTO agent (this build) | Roosevelt |
| Landing pages, subdomain, pixel | Ahmed (web) |
| Stripe account and GHL billing | Leah |
| Offers, prices, what the agents are allowed to claim | Kane |
| Meta ads | Kane |

### 2. THE BOUNDARY WITH ROOSEVELT'S BUILD (HARD RULES)

1. **Notify Indigo before editing any GHL or n8n workflow, of any kind.** A credential swap, a deactivation or a test counts as an edit. Reads (listing, execution history, node inspection) need no notification.
2. **Roosevelt does not edit, duplicate or create GHL or n8n workflows.** The build reads status and data only, using its own scoped read credentials.
3. **Anything the build needs from inside GHL** (for example the WhatsApp quote send, or a webhook out of a workflow) is a written request to Indigo, copied to Kane.
4. **Credentials:** the build never uses a credential that belongs to Indigo's account. It gets its own.
5. **Incidents:** if a workflow fails, the CTO alerts Indigo and Kane. It does not attempt a fix.

### 3. SCORECARD (CTO checks daily, reviews weekly)

| # | KPI | Source | Target | Floor |
|---|---|---|---|---|
| IK1 | Workflow reliability: % successful executions per workflow, 7 days | n8n executions API | 99%+ per workflow | Below 95% on any workflow |
| IK2 | Escalation Router health | n8n executions | 0 failures | Any failure (P1) |
| IK3 | Incident response: failure alert to Indigo acknowledgement | Alert log | Within 4 hours in her working hours **(confirm)** | Next day |
| IK4 | WhatsApp coach responsiveness: member messages answered by the coach | GHL conversations | 100% answered, median under 5 minutes **(confirm)** | Any member unanswered 24h |
| IK5 | Instagram agent conversion: threads that complete the full qualifying ladder, and booking rate of those threads | GHL conversations + Calendly | Baseline recorded: full-ladder threads booked 73%, threads with 3 or fewer questions booked 0% | Full-ladder completion falling week on week |
| IK6 | Change discipline: edits with a change note | Her change log vs n8n workflow update timestamps | 100% | Any unlogged edit |

**Rule:** per workflow and per agent, never one blended "automation health" score.

### 4. WHAT THE CTO DOES FOR INDIGO

- Sends her workflow failure alerts with the execution id and error.
- Weekly reliability summary per workflow.
- Passes agent conversation issues found in triage (wrong price quoted, claim made, member unanswered) to Indigo and Kane with the thread reference.

### 5. DASHBOARD ACCESS (phase 4 roles)
Systems health page (workflow status, agent response metrics) and her own scorecard. No finance, no customer lists beyond thread references.

---

# PART P4

## ASIM: UK PICK AND PACK (FULFILMENT PARTNER)

**Reports to:** Kane (money and terms), Leah (day-to-day order issues)
**Identity warning for the build:** a coaching client has a near-identical name. The CRM must key people on email and system IDs, never on name. Asim appears in the system as the fulfilment partner and a Shopify staff account, never as a customer record.

### 1. EXACT POSITION

Asim picks, packs and dispatches **UK orders only** from the Shopify store. International orders (UAE, Ireland, anywhere needing customs) are handled in-house, not by Asim.

#### 1.1 How he works
Opens an unfulfilled UK order in Shopify, buys a Royal Mail Tracked 48 label through Shopify's native shipping, prints the 4x6 label and the A4 packing slip, packs, dispatches.

#### 1.2 Owns
| # | Owns |
|---|---|
| O1 | Every UK order dispatched **within 24 hours of payment** (working days) |
| O2 | Every component of a bundle or stack physically shipped, not just the parent line marked fulfilled |
| O3 | A tracking number on every shipment |
| O4 | Stock counts at his location, reported when asked and at each stock delivery |
| O5 | Flagging a stock-out or damaged stock the same day |

#### 1.3 Not his
| Not his | Whose |
|---|---|
| International and customs orders | In-house team |
| Refunds and customer replies | Leah |
| Stock purchasing and reorder timing | Kane |
| Prices, discounts | Kane |

### 2. SCORECARD (CTO checks daily, reviews weekly)

| # | KPI | Source | Target | Floor |
|---|---|---|---|---|
| AK1 | **24h dispatch rate**: % UK orders fulfilled with tracking within 24 working hours of payment | Shopify order paid_at vs fulfillment created_at | 100% | Below 95% in a day, or any order older than 48h |
| AK2 | Open UK unfulfilled at 16:00 UK | Shopify | Only orders paid in the last 24h | Any order paid more than 24h ago |
| AK3 | **Component completeness**: stack/bundle orders where every component has shipped with tracking | Shopify fulfillment line items per component | 100% | Any parent-fulfilled order with an unshipped component |
| AK4 | Tracking present | Shopify fulfillments | 100% | Any fulfillment without tracking |
| AK5 | Delivery issues: "not arrived", wrong item, damaged | Customer service tags + Royal Mail tracking status | Under 1% of orders **(confirm)** | Above 2% |
| AK6 | Label cost per order | Shopify shipping label charges | Standard Tracked 48 rate | Any label above standard without reason |
| AK7 | Refunds issued from his staff account | Shopify refund events by staff user | 0 (refunds are Leah's) | Any |

**Known system issue to build around:** a bundle app can auto-mark the parent line as fulfilled while the individual components never ship. AK3 must check component-level tracking, not the parent flag. Order counts that rely on the parent flag will overstate dispatch.

### 3. WHAT THE CTO DOES

- 16:00 UK daily check: any UK order older than 24h unfulfilled goes to Asim and Leah (P2), older than 48h to Kane (P1).
- Daily report line: 24h dispatch %, open count, oldest order age, component gaps.
- Weekly review: dispatch trend per day of week, delivery issue rate, any refund from his account.

### 4. DASHBOARD ACCESS
None required. Kane and Leah see the Fulfilment page. If Asim is given access later: fulfilment queue only, no revenue or customer data beyond the shipping address already visible to him in Shopify.

---

# APPENDIX A: LEAH'S DAILY FINANCE TEMPLATE (CSV)

Save as `TFP-finance-YYYY-MM-DD.csv`. Columns and rules are in Part 04 section 2. Example rows show format only; amounts are zero.

```csv
date,row_type,account,business_line,category,counterparty,amount,currency,reference,status,due_date,approved_by,notes
2026-09-15,BALANCE,REVOLUT_GBP,,,,0.00,GBP,,CLEARED,,,end of day balance
2026-09-15,BALANCE,REVOLUT_AED,,,,0.00,AED,,CLEARED,,,end of day balance
2026-09-15,BALANCE,STRIPE,,,,0.00,GBP,,CLEARED,,,available balance
2026-09-15,IN,REVOLUT_GBP,SUPPLEMENTS,PAYOUT_SHOPIFY,Shopify,0.00,GBP,EXAMPLE-PAYOUT-ID,CLEARED,,,
2026-09-15,IN,REVOLUT_GBP,COACHING,PAYOUT_STRIPE,Stripe,0.00,GBP,EXAMPLE-po_id,CLEARED,,,
2026-09-15,OUT,REVOLUT_GBP,SUPPLEMENTS,FULFILMENT_PICKPACK,Pick and pack,0.00,GBP,EXAMPLE-INV-001,CLEARED,,KANE,
2026-09-15,OUT,REVOLUT_GBP,SHARED,SOFTWARE_KLAVIYO,Klaviyo,0.00,GBP,EXAMPLE-INV-002,CLEARED,,KANE,monthly
2026-09-15,DUE,REVOLUT_GBP,SUPPLEMENTS,COGS_SUPPLIER,Example Supplier Ltd,0.00,GBP,EXAMPLE-INV-003,DUE,2026-09-22,,awaiting Kane
```

*End of document.*
