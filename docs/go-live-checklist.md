# Go-live checklist

Everything that must be true before `PAYMENTS_LIVE=true` in Vercel production.
Work top to bottom; the flag is the last step, never the first.

Verified against the account on 28 July 2026: `acct_1TrhfSCLiGZiNdJR`,
`train.theformulaperformance`, GB/GBP, charges enabled. Live mode currently has
no products and no webhook endpoint, which is expected — everything built so far
is test mode.

## 1. Stripe account settings

Dashboard, in **live mode**. These are the client's to approve.

- [ ] **Statement descriptor.** Currently reads `TRAIN.THEFORMULAPERFOR`. Change
      to something recognisable, e.g. `THE FORMULA`. A generic or truncated
      descriptor is a leading cause of "I don't recognise this charge" disputes.
- [ ] **Successful payment receipts: ON.** Every charge, including each monthly
      £79, then gets a Stripe receipt with a hosted invoice link. We do not
      rebuild this.
- [ ] **Failed payment and card-update emails: ON.** Stripe handles all dunning
      comms.
- [ ] **Smart Retries: ON**, terminal action **cancel subscription**. That
      produces a clean `customer.subscription.deleted` for us.
- [ ] **Webhook-endpoint-failing emails: ON.** Catches a misconfigured endpoint
      before customers do.
- [ ] **Customer portal login page: enabled**, link copied for emails and the
      footer.
- [ ] **VAT.** `automatic_tax` stays off until a registration exists. Prices are
      already `tax_behavior: inclusive`, so enabling it later needs no price
      migration. Confirm the client's registration status before launch.

## 2. Live Stripe objects

- [ ] `pnpm stripe:bootstrap` against **live** mode. Creates the Programme,
      Membership, PRO and ELITE products with their lookup keys. Idempotent.
- [ ] Verify in the Dashboard: four products, GBP, £149 / £79 / £999 / £2,900,
      correct lookup keys.
- [ ] Create the **live webhook endpoint** pointing at
      `https://train.theformulaperformance.com/api/stripe/webhook`, subscribed
      to the same event list as test mode.
- [ ] Copy its signing secret into `STRIPE_WEBHOOK_SECRET` (live value).

## 3. Environment variables

Set in **both** Vercel production and Trigger.dev production. A variable missing
on the Trigger side fails the first task run rather than failing the deploy.

- [ ] `STRIPE_SECRET_KEY` — live **restricted** key (`rk_live_...`), not `sk_`
- [ ] `STRIPE_WEBHOOK_SECRET` — from the live endpoint above
- [ ] `RECONCILE_HEARTBEAT_URL` — BetterStack heartbeat for `reconcile-ghl`.
      Optional in code, but without it the dead-man's switch is inert and a
      reconcile that stops running alerts nobody.
- [ ] `DATABASE_URL` and `DIRECT_URL` — production Supabase
- [ ] `RESEND_API_KEY`, `RESEND_FROM`, `EMAIL_COMMUNITY_URL`; Performance logo uploaded under Admin → Integrations
- [ ] `GHL_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`, `GHL_SYNC_ENABLED=true`
- [ ] `BLOB_READ_WRITE_TOKEN`, `FORMULA_BLOB_STORE_ID`
- [ ] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — real keys

## 4. Trigger.dev

- [ ] `pnpm trigger:deploy` — **before** the Vercel deploy. An enqueue for an
      undeployed task id fails, and scheduled crons only sync on deploy.
- [ ] Confirm both schedules appear: `sweep-stripe-events` (02:45 UTC) and
      `reconcile-ghl` (03:15 UTC), both PRODUCTION only.
- [ ] Set dashboard alerts on run failure for `fulfill-purchase`,
      `watermark-pdf`, `sync-ghl-membership`, `reconcile-ghl` and
      `sweep-stripe-events`.

## 5. GHL

- [ ] Confirm the field ids in `src/lib/ghl/membership-fields.ts` still match the
      live location. They were read from it on 28 July 2026; a renamed or
      recreated field changes its id.
- [ ] Confirm the tag names in `src/lib/ghl/membership-tags.ts` match Indigo's
      current spec.
- [ ] Confirm `programme-welcome` still fires her T1 WhatsApp template.
- [ ] Agree who sets `comp` for free access, and that reconcile skipping those
      contacts is understood.

## 6. Content

- [ ] Master programme PDF uploaded to the private Blob store, and the
      watermarked output checked on a real purchase.
- [ ] Welcome email rendering checked on a phone, not just desktop.
- [ ] Rollover copy on `/checkout` approved by the client. It must stay above
      the pay button.

## 7. Funnel recovery & channels

- [ ] Smoke-test abandoned checkout recovery in **test mode** (flag defaults
      on): expire a Checkout Session, confirm the 30m email, then pay and
      confirm later steps stop.
- [ ] Confirm ChannelEligibility suppresses opted-out / purchased contacts.
- [ ] Set Complete Stack storefront URLs (`COMPLETE_STACK_URL` /
      `_MALE_` / `_FEMALE_`) before announcing founder stack pricing.
- [ ] Telegram customer activation: set `TELEGRAM_BOT_USERNAME` and webhook
      still reaches `/api/telegram/webhook`.
- [ ] Instagram inbound: Meta app webhook → `/api/webhooks/meta`, verify token
      + app secret set.
- [ ] **WhatsApp Cloud API** (same Meta webhook as IG — subscribe `whatsapp_business_account` on `/api/webhooks/meta`):
      - Paste `WHATSAPP_ACCESS_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` in Integrations
      - Approve templates in Business Manager, then set exact names in
        **Admin → Growth → WhatsApp** (MessageTemplate CRUD). Env
        `WHATSAPP_TEMPLATE_*` is fallback only.
      - Confirm waitlist join enqueues `waitlist_welcome`
      - Confirm abandoned-checkout 24h step sends `checkout_recovery`
      - Confirm purchase sends `purchase_confirmation` + `purchase_activation`
        (flag `WHATSAPP_SEND_PURCHASE_ACTIVATION`, default true)
      - Confirm coaching intake sends `service_registered`
      - Confirm STOP / unsubscribe withdraws WhatsApp consent
      - Confirm inbound WA statuses update OutboundMessage on the shared Meta path
- [ ] Funnel metrics visible at `/admin/growth/funnel`.
- [ ] Apply funnel CRM + Client 360 migrations if not already deployed.

## 7b. GDPR Step 0 (Roosevelt — before live bank/customer pulls)

- [ ] Contractor agreement with confidentiality + data-processing clauses signed.
- [ ] Access register sent to Kane (every system access + reason).
- [ ] Named, scoped, revocable credentials only (enter in `/admin/integrations`).
- [ ] Secrets only in Vercel / Trigger / Integrations secret store — never chat.
- [ ] Confirm UK/EU Postgres region for customer PII.

## 8. Final verification

- [ ] Full CI matrix green, including both E2E jobs.
- [ ] A **live-mode** test purchase with a real card, refunded afterwards.
      Confirm: success page, welcome email, watermarked PDF, GHL tags and
      fields, Stripe receipt.
- [ ] `select * from "StripeEvent" order by "receivedAt" desc limit 10` shows
      the live events as `processed`.
- [ ] Whoever is on call has read `docs/payments-runbook.md`.

## 9. Flip

- [ ] `PAYMENTS_LIVE=true` in Vercel production. **The client's call, launch
      day.**
- [ ] Watch the first three real purchases end to end before announcing.

## Rolling back

Set `PAYMENTS_LIVE=false`. The routes 404 again immediately and no new checkout
can start. Purchases already made are unaffected: their webhooks still arrive
and fulfilment still runs, because only the customer-facing routes are gated.
