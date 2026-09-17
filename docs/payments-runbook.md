# Payments runbook

What to do when something goes wrong with a payment. Written for whoever is on
call, not for whoever wrote the code.

Every command runs from the repo root. Stripe CLI commands take
`--project-name=formula`, never `--live` unless the step says so.

## Where to look first

| Question | Surface |
|---|---|
| Did the money move? | Stripe Dashboard. It is the system of record, always. |
| Did we hear about it? | `StripeEvent` table. One row per delivery, with its payload. |
| Did the work run? | Trigger.dev dashboard, filtered by task. |
| Why did it break? | Sentry, searching the purchase ref or Stripe id. |

Our database is a derived copy of Stripe, never the truth. If the two disagree,
Stripe is right and ours needs repairing.

## Correlation keys

Every payment log line carries these, so one search answers "what happened to
this customer":

- `purchaseRef` — the `FP-XXXXXXXX` code the buyer sees on the success page
- `stripeEventId` — `evt_...`
- `stripeSubscriptionId` — `sub_...`
- `customerId` — our cuid, not Stripe's

Start from whichever the customer gave you. The purchase ref is on their
receipt and in the welcome email.

---

## "I paid but got no email"

The most common report. Work down this list; stop when you find the break.

**1. Did the payment actually succeed?**

Stripe Dashboard → Payments, search their email. A payment that is not
`Succeeded` means nothing else ran, and the customer needs to retry rather than
be fulfilled.

**2. Do we have a purchase row?**

```sql
select ref, status, "welcomeEmailAt", "pdfReadyAt", "ghlSyncedAt"
from "Purchase" p join "Customer" c on c.id = p."customerId"
where c.email = 'them@example.com';
```

The three timestamps are the step ledger. Each is set once, by the task that
owns it, and tells you exactly how far fulfillment got.

- **No row at all** → the webhook never landed. Go to step 3.
- **Row exists, `welcomeEmailAt` null** → fulfillment ran, the email did not.
  Go to step 4.
- **`welcomeEmailAt` set** → we sent it. Check Resend for a bounce, and check
  their spam. Do not resend by clearing the column unless Resend shows no
  delivery: the ledger is what stops a duplicate.

**3. The webhook never landed**

```sql
select id, type, status, attempts, "lastError", "receivedAt"
from "StripeEvent" order by "receivedAt" desc limit 20;
```

| Status | Meaning | Action |
|---|---|---|
| `processed` | Handled fine | Look elsewhere |
| `skipped` | No handler for this type | Expected, not a fault |
| `failed` | Handler threw, Stripe gave up | Redrive (below) |
| `received` | Stored before its handler existed | Redrive |
| `enqueued` older than a few minutes | Process died mid-handler | Redrive |

If there is no row for their payment at all, Stripe never reached us. Check
Stripe Dashboard → Developers → Webhooks for delivery failures, then let the
nightly sweep pick it up or replay by id.

**4. Fulfilled but the email did not send**

Trigger.dev dashboard → `send-purchase-welcome`, find the run by purchase ref.
The failure reason is on the run. If it was a transient Resend problem, the
retries have already been exhausted; clear the claim and re-trigger:

```sql
update "Purchase" set "welcomeEmailAt" = null where ref = 'FP-XXXXXXXX';
```

Then re-run the task from the Trigger dashboard. Only do this when you have
confirmed no email was delivered.

---

## Replaying a stuck event

Dry run first. Always.

```bash
pnpm redrive:purchases --status failed
pnpm redrive:purchases --status failed --execute
```

Other selections:

```bash
pnpm redrive:purchases --id evt_123 --execute
pnpm redrive:purchases --status received --type invoice.paid --execute
pnpm redrive:purchases --status failed --since 2026-07-01 --execute
```

Every handler is idempotent, so replaying one that already succeeded does
nothing. Replaying is safe; guessing is not.

The nightly sweep (`sweep-stripe-events`, 02:45 UTC) does this automatically for
anything older than 72 hours, which is when Stripe stops retrying. You only need
the manual command when you cannot wait for tonight.

---

## "Their WhatsApp coaching never started"

Entitlement lives in GHL tags, not in our database. A member who paid but has no
tags cannot be coached.

**Check the contact.** GHL → Contacts, search their email. A paying member
should hold `track-b`, `tier-programme`, `consent-whatsapp` and
`programme-welcome`.

**If tags are missing**, the sync dropped. It is deliberately fire-and-forget:
the enqueue can never fail the webhook, because a non-2xx would make Stripe
delay invoice finalization for up to 72 hours. So a dropped sync is silent by
design, and the nightly `reconcile-ghl` (03:15 UTC) is what restores it.

To fix now rather than tonight, re-run `sync-ghl-membership` from the Trigger
dashboard with the purchase payload.

**`programme-active` is not ours.** Indigo's side sets it when the member first
messages the bot. If it is missing, the member has not started the conversation
yet — that is not a bug. We only ever remove it, on cancel.

**Comped members** carry the `comp` tag. Reconcile skips them entirely, so
someone granted free access by hand never has it revoked overnight.

---

## "I want to cancel"

Send them the Customer Portal login link. It is a permanent URL that emails them
a one-time passcode, so it can go in any email without expiring:

Stripe Dashboard → Settings → Billing → Customer portal → login page link.

Cancelling there sets `cancel_at_period_end`, so they keep access until the
period they have paid for ends. Our `customer.subscription.updated` handler
picks it up; nothing manual is needed.

## Refunds

Refund in the Stripe Dashboard. Our `charge.refunded` handler marks the purchase
`refunded` automatically, matching on the stored payment intent.

A refund does **not** currently revoke the PDF or the GHL tags. That was the
deliberate default (goodwill); if the client wants revocation, it is a code
change, not a manual step.

---

## Nightly jobs

| Task | When | Does |
|---|---|---|
| `sweep-stripe-events` | 02:45 UTC | Replays events Stripe stopped retrying |
| `reconcile-ghl` | 03:15 UTC | Restores tags a paying member is missing |

The order matters: a payment recovered by the sweep produces tags that the same
night's reconcile then checks.

**Reconcile is add-only.** It restores what is missing and reports anything
unexpected without removing it, because the coach hand-tags contacts and we
cannot tell her edits from our bugs. Look for `Members holding tags they should
not` in the logs.

**The heartbeat is the dead-man's switch.** `reconcile-ghl` pings
`RECONCILE_HEARTBEAT_URL` only on a clean finish, so a run that throws or never
starts stops the heartbeat and alerts. If BetterStack reports the heartbeat
missing, reconciliation is not running and drift is accumulating silently.

---

## Incidents worth knowing

**Kill switch.** `GHL_SYNC_ENABLED=false` stops all CRM sync without touching
payments or emails. Tags then drift until it is re-enabled, and reconcile
repairs them on the first clean night after.

**Webhook secret rotated.** Deliveries fail signature verification and never
reach the database, so there is nothing to redrive. Update
`STRIPE_WEBHOOK_SECRET`, then use Stripe Dashboard → Webhooks → resend for the
affected window. Anything missed is rebuilt by the nightly sweep, provided it is
under 30 days old — that is as far back as Stripe keeps full payloads.

**Deploy ordering.** `pnpm trigger:deploy` runs **before** the Vercel deploy.
Enqueuing a task id that is not deployed yet fails. Scheduled tasks also sync
their cron on deploy, so a schedule change only takes effect after
`trigger:deploy`.

**Env parity.** Trigger.dev has its own environment. `STRIPE_SECRET_KEY`,
`DATABASE_URL`, `RESEND_API_KEY`, `GHL_*`, the Blob token and
`RECONCILE_HEARTBEAT_URL` must all be set there as well as in Vercel. A missing
one fails the first task run loudly rather than silently.

**Checkout recovery.** Abandoned sessions enqueue `checkout-recovery-step`
only when `CHECKOUT_RECOVERY_ENABLED=true` (same flag in Vercel and Trigger).
Steps are 30m / 6h / 24h / 48h; purchase fulfilment cancels later steps via
idempotency + purchase lookup. If recovery emails stop, check the flag first,
then Trigger runs for `checkout-recovery-step`, then Resend. Leave the flag
off until a staging expire→email→pay smoke test has passed.

**Supabase 3F000 errors.** The roughly 113/hour `3F000` errors in the Supabase
dashboard are benign noise from the disabled Data API. Do not re-enable the Data
API to silence them.
