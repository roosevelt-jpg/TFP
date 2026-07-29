# Manual walkthrough

The one test nothing automated covers: a single purchase through the whole
chain, in one sitting, the way a customer will experience it.

Everything else has been verified in pieces against real systems. What this
catches is the handoffs between them.

Run locally, not on preview. Preview's webhook secret is a local `stripe listen`
secret, so real Stripe webhooks fail signature verification there and only the
success-page ingress runs. Locally both ingresses work, which is the thing worth
testing.

## Setup

Three terminals:

```bash
pnpm dev                                   # includes stripe listen
pnpm trigger:dev                           # tasks must be running or nothing fulfils
pnpm db:studio                             # to watch rows appear
```

Confirm `PAYMENTS_LIVE=true` is in `.env.local` before starting, and remove it
afterwards so the E2E gate specs keep passing locally.

Card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 1. Checkout

- [ ] `/checkout` renders with the order summary
- [ ] The rollover line sits **above** the pay button: "£149 today for the
      8-week programme, then £79 a month. Cancel anytime."
- [ ] Submitting empty shows errors on all four fields
- [ ] A real submit shows "Taking you to checkout…" and **never flashes back**
      to idle before the redirect
- [ ] Browser console shows **no CSP violation** on the handoff to Stripe

## 2. Pay

- [ ] Stripe Checkout shows both line items: £149 today, £79/mo from week 8
- [ ] The promo field accepts `FORMULA50`
- [ ] Payment completes and redirects back

## 3. Success page

- [ ] Order ref shown (`FP-XXXXXXXX`)
- [ ] WhatsApp link and QR code visible
- [ ] Coaching form present
- [ ] Reloading the page does **not** duplicate anything

In Studio, confirm one row each: `Customer`, `Purchase` (status `paid`),
`Subscription` (status `trialing`).

## 4. Message the bot

The handoff nothing automated covers, because it is Indigo's side.

- [ ] The wa.me link opens WhatsApp with the prefilled message
- [ ] Sending it gets a reply from the bot

## 5. Welcome email

Check on a **phone**, not desktop.

- [ ] Arrives within a minute
- [ ] Two fonts only, no em dashes
- [ ] The rollover date matches what the success page said
- [ ] PDF link works
- [ ] Billing link opens the Stripe portal login page

## 6. The PDF

- [ ] Opens without error
- [ ] **Your name, email and order ref are in the footer**
- [ ] All 39 pages present
- [ ] The link still works in a fresh incognito window

## 7. GHL contact

Open the contact in GHL and check tags:

- [ ] `track-b`
- [ ] `tier-programme`
- [ ] `consent-whatsapp`
- [ ] `programme-welcome`

And fields:

- [ ] Stripe Customer Id
- [ ] Track = `B - Programme`, Tier = `Programme`
- [ ] Programme / Block start dates, Block End Date, Rollover Date
- [ ] Subscription Status = `Active`
- [ ] Intake Status = `In progress`

**`programme-active` will not be there.** Indigo's side sets it once the member
messages the bot. Its absence here is correct.

## 8. Coaching answers

- [ ] Fill the coaching form on the success page
- [ ] Re-check GHL: Goal now holds one of Muscle / Focus-energy / Fat-loss /
      General / Performance
- [ ] Intake Status now reads `complete`
- [ ] Waitlist Goal also populated, unless the goal was focus or general

## 9. Idempotency

The core reliability claim, worth proving by hand once:

```bash
stripe --project-name=formula events resend <evt_id>
```

- [ ] Still exactly one `Purchase` row
- [ ] No second welcome email
- [ ] Step ledger timestamps unchanged

## 10. Cancel

- [ ] Open the portal via the email link
- [ ] Cancel the subscription
- [ ] Studio shows `cancelAtPeriodEnd = true`
- [ ] GHL contact gains `cancelled`, Subscription Status reads `Cancelled`

---

## If something breaks

Note which step, then check `docs/payments-runbook.md` — it is organised by
symptom. The step ledger on `Purchase` (`welcomeEmailAt`, `pdfReadyAt`,
`ghlSyncedAt`) tells you exactly how far fulfilment got.
