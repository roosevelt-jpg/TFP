# Command runbook

How to operate TFP Command after handover: add a threshold, add a data source, rotate a key, restore the database. Credentials live in the encrypted vault (`/admin/integrations`) — prefer vault over env when both exist.

Connectors call `resolveSecret` and **skip gracefully** when a key is missing (no hard crash). Live acceptance still needs Kane to paste keys and run demos.

Also see: [go-live-checklist.md](./go-live-checklist.md), [payments-runbook.md](./payments-runbook.md), [editor-knowledge-base.md](./editor-knowledge-base.md). Spec completion UI: `/admin/spec-completion` (Kane-only).

---

## Add or change an alert threshold

1. Sign in as Kane → **Settings + access**.
2. Edit the threshold row for the rule id (from `src/lib/alerts/rules-config.ts`).
3. Save — behaviour changes on the next `command.evaluate-alerts` cycle (about 5 minutes). No deploy.

Test-fire from the same Settings panel (Alert test fire) for a one-shot delivery check.

---

## Add a data source

1. Register the connector id in seed / warehouse registry if new (`scripts/seed-command.ts`).
2. Add vault fields under `src/lib/secrets/catalog.ts` (`CREDENTIAL_GROUPS`).
3. Implement a pull in `src/lib/connectors/*` using `resolveSecret` + graceful skip.
4. Schedule or expose a Trigger task in `src/trigger/command-connectors.ts`.
5. Kane pastes credentials (below) and confirms a successful run on **Integrations**.

---

## Rotate a key

1. Kane unlocks the vault on **Integrations + API** (vault passcode).
2. Paste the new value for the field; save.
3. Confirm the next scheduled pull succeeds (Integrations run status / Trigger.dev).
4. Revoke the old key in the upstream console (Shopify, Meta, Stripe, etc.).

Env-only keys (Vercel / Trigger) must be rotated in both places when not mirrored through the vault.

---

## Restore the database

1. Use Neon / Postgres point-in-time restore (or latest snapshot) for `DATABASE_URL`.
2. Point `DIRECT_URL` at the restored direct connection for migrations.
3. Run `pnpm db:deploy` if schema drift is expected.
4. Re-unlock vault passcode if `VaultSettings` / encrypted secrets were restored from an older backup.
5. Smoke: Kane login + 2FA, one connector pull, one alert evaluate.

---

## Keys to paste

Paste each group under **Admin → Integrations + API** (Kane vault). Groups match `CREDENTIAL_GROUPS` in `src/lib/secrets/catalog.ts`.

### S1 — Shopify

| Key | Notes |
|---|---|
| `SHOPIFY_SHOP_DOMAIN` | `your-shop.myshopify.com` |
| `SHOPIFY_ADMIN_TOKEN` | Admin API token |

### S2 — Stripe

| Key | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | Secret / restricted key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |

### S3 — Meta Ads

| Key | Notes |
|---|---|
| `META_ACCESS_TOKEN` | Marketing API |
| `META_AD_ACCOUNT_ID` | `act_…` |

### S4 — Klaviyo

| Key | Notes |
|---|---|
| `KLAVIYO_API_KEY` | Private API key |
| `KLAVIYO_CONVERSION_METRIC_ID` | Placed Order metric (optional; auto-resolve if blank) |

### S5 — GoHighLevel

| Key | Notes |
|---|---|
| `GHL_INTEGRATION_TOKEN` | Private integration token (TFP-owned, not Indigo’s) |
| `GHL_LOCATION_ID` | Location / sub-account ID |

### S6 — n8n

| Key | Notes |
|---|---|
| `N8N_API_URL` | API base URL |
| `N8N_API_KEY` | API key (read/health only) |

### S7 — Gmail

| Key | Notes |
|---|---|
| `GMAIL_CLIENT_ID` | OAuth client ID |
| `GMAIL_CLIENT_SECRET` | OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Refresh token |

### Mail — Mail drivers

| Key | Notes |
|---|---|
| `GMAIL_SMTP_USER` | Gmail SMTP user / address |
| `GMAIL_SMTP_PASS` | 16-char app password |
| `GMAIL_SMTP_FROM` | Optional From |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM` | Resend From |

### Funnel — Funnel & channels

| Key | Notes |
|---|---|
| `COMPLETE_STACK_URL` | Complete Stack storefront URL |
| `COMPLETE_STACK_MALE_URL` | Male stack URL |
| `COMPLETE_STACK_FEMALE_URL` | Female stack URL |
| `TELEGRAM_BOT_USERNAME` | Bot username (no `@`) |
| `META_WEBHOOK_VERIFY_TOKEN` | Meta webhook verify token |
| `META_APP_SECRET` | Meta app secret |
| `META_PAGE_ACCESS_TOKEN` | Meta page access token |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Business account ID |

### WhatsAppTemplates — WhatsApp templates (env fallback)

Prefer Growth → WhatsApp → Templates in admin; these are env fallbacks only.

| Key | Notes |
|---|---|
| `WHATSAPP_TEMPLATE_WAITLIST_WELCOME` | |
| `WHATSAPP_TEMPLATE_CHECKOUT_RECOVERY` | |
| `WHATSAPP_TEMPLATE_PURCHASE_CONFIRMATION` | |
| `WHATSAPP_TEMPLATE_PURCHASE_ACTIVATION` | |
| `WHATSAPP_TEMPLATE_ACTIVATION_REMINDER` | |
| `WHATSAPP_TEMPLATE_SERVICE_REGISTERED` | |
| `WHATSAPP_SEND_PURCHASE_ACTIVATION` | `true` / `false` |

### S8 — Calendly

| Key | Notes |
|---|---|
| `CALENDLY_TOKEN` | Personal access token |

### S12 — Revolut

| Key | Notes |
|---|---|
| `REVOLUT_API_TOKEN` | Business API (read-only cash) |

### S13 — Frame.io

| Key | Notes |
|---|---|
| `FRAME_IO_TOKEN` | API token |
| `FRAME_IO_ACCOUNT_ID` | Optional account UUID |
| `FRAME_IO_FOLDER_ID` | Intake folder for remote upload |

### S14 — Instagram publish

| Key | Notes |
|---|---|
| `META_INSTAGRAM_ACCOUNT_ID` | IG business account ID |
| `META_PAGE_ACCESS_TOKEN` | Page access token (publish) |

### S15 — TikTok publish

| Key | Notes |
|---|---|
| `TIKTOK_ACCESS_TOKEN` | Content Posting API — private until TikTok audits the app |

### S16 — YouTube publish

| Key | Notes |
|---|---|
| `YOUTUBE_ACCESS_TOKEN` | Data API — private until Google audits the project |

### Telegram

| Key | Notes |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token |
| `TELEGRAM_KANE_CHAT_ID` | Kane chat ID (bot ignores others) |
| `TELEGRAM_LEAH_CHAT_ID` | Leah (uploads) |
| `TELEGRAM_LEMONI_CHAT_ID` | Lemoni |

### CTO — CTO agent

| Key | Notes |
|---|---|
| `GEMINI_API_KEY` | Preferred for CTO drafts + compliance OCR/ASR |
| `GEMINI_MODEL` | Optional (default `gemini-2.5-flash`) |
| `ANTHROPIC_API_KEY` | Optional fallback if Gemini unset |

### Blob — Media blob storage

| Key | Notes |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write |
| `FORMULA_BLOB_STORE_ID` | Optional store id |

### PublishProvider — Audited publish provider (interim)

| Key | Notes |
|---|---|
| `CONTENT_PUBLISH_PROVIDER_URL` | Base URL Kane chooses until platform audits complete |
| `CONTENT_PUBLISH_PROVIDER_TOKEN` | Provider API token |

---

## Monthly running-cost (estimate)

Recorded for handover (update when Kane confirms invoices). Figures are **order-of-magnitude GBP/month** at Command scale — not a quote.

| Line | Est. £/mo | Notes |
|---|---:|---|
| Vercel (Pro + Blob) | 20–80 | App + Blob storage/bandwidth |
| Neon Postgres | 0–50 | Scale-to-zero / launch; rises with warehouse size |
| Trigger.dev | 0–40 | Schedules + connector pulls |
| Gemini API (CTO + OCR/ASR) | 10–60 | Usage-tied; Anthropic fallback optional |
| Telegram Bot API | 0 | Free |
| Meta / TikTok / YouTube API | 0 | Platform APIs; ads spend separate |
| Audited publish provider (interim) | TBD | Kane chooses; paste URL under Integrations |
| **Ballpark total (infra)** | **~50–230** | Excludes Meta ad spend, Shopify, GHL, Indigo |

Update this table after the first full calendar month in production.
