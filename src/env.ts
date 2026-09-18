import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PAYMENTS_LIVE: z.stringbool().default(false),
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url(),
    DB_POOL_MAX: z.coerce.number().int().positive().default(1),
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().min(1),
    EMAIL_COMMUNITY_URL: z.url(),
    // Admin invites prefer Gmail SMTP; optional when Resend is the only driver.
    GMAIL_SMTP_USER: z.string().min(1).optional(),
    GMAIL_SMTP_PASS: z.string().min(1).optional(),
    GMAIL_SMTP_FROM: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    SENTRY_ORG: z.string().min(1).optional(),
    SENTRY_PROJECT: z.string().min(1).optional(),
    SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    GHL_INTEGRATION_TOKEN: z.string().min(1),
    GHL_LOCATION_ID: z.string().min(1),
    // Launch-day kill switch: CRM sync isn't time-critical, so it can be
    // disabled under incident without touching emails and redriven later.
    GHL_SYNC_ENABLED: z.stringbool().default(true),
    // Abandoned checkout recovery (30m / 6h / 24h / 48h).
    CHECKOUT_RECOVERY_ENABLED: z.stringbool().default(true),
    // Funnel feature flags (spec §16).
    FUNNEL_V2_ENABLED: z.stringbool().default(true),
    LEAD_NURTURE_ENABLED: z.stringbool().default(true),
    WHATSAPP_WORKFLOWS_ENABLED: z.stringbool().default(true),
    // First-party purchase WhatsApp (confirmation + activation templates).
    // Default on — disable only if GHL must be the sole purchase WA sender.
    WHATSAPP_SEND_PURCHASE_ACTIVATION: z.stringbool().default(true),
    TELEGRAM_ACTIVATION_ENABLED: z.stringbool().default(true),
    INSTAGRAM_INBOUND_ENABLED: z.stringbool().default(true),
    COMPLETE_STACK_ENABLED: z.stringbool().default(true),
    // Public Shopify (or other) storefront URL for the Complete Stack upsell.
    COMPLETE_STACK_URL: z.url().optional(),
    COMPLETE_STACK_MALE_URL: z.url().optional(),
    COMPLETE_STACK_FEMALE_URL: z.url().optional(),
    // Meta Instagram / WhatsApp messaging webhook verify token.
    META_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),
    META_APP_SECRET: z.string().min(1).optional(),
    META_PAGE_ACCESS_TOKEN: z.string().min(1).optional(),
    META_INSTAGRAM_ACCOUNT_ID: z.string().min(1).optional(),

    // WhatsApp Cloud API (optional until WABA credentials are pasted).
    WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
    WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_WAITLIST_WELCOME: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_CHECKOUT_RECOVERY: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_PURCHASE_CONFIRMATION: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_PURCHASE_ACTIVATION: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_ACTIVATION_REMINDER: z.string().min(1).optional(),
    WHATSAPP_TEMPLATE_SERVICE_REGISTERED: z.string().min(1).optional(),
    // BetterStack heartbeat. Reconcile is the guarantee of last resort, so it
    // failing silently is the one failure nothing else would catch.
    RECONCILE_HEARTBEAT_URL: z.url().optional(),

    // Private store holding the master programme and each watermarked copy.
    // Optional locally — PDF/email logo blob features need these in prod.
    FORMULA_BLOB_STORE_ID: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

    // TFP Command (/admin) — Better Auth session secret (32+ chars).
    BETTER_AUTH_SECRET: z.string().min(32),

    // Telegram CTO channel. Optional until Phase 2; locked to Kane's chat.
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
    TELEGRAM_KANE_CHAT_ID: z.string().min(1).optional(),
    TELEGRAM_LEAH_CHAT_ID: z.string().min(1).optional(),

    // Phase 1+ read connectors (optional until Step 0 credentials land).
    SHOPIFY_SHOP_DOMAIN: z.string().min(1).optional(),
    SHOPIFY_ADMIN_TOKEN: z.string().min(1).optional(),
    META_ACCESS_TOKEN: z.string().min(1).optional(),
    META_AD_ACCOUNT_ID: z.string().min(1).optional(),
    KLAVIYO_API_KEY: z.string().min(1).optional(),
    CALENDLY_TOKEN: z.string().min(1).optional(),
    N8N_API_URL: z.url().optional(),
    N8N_API_KEY: z.string().min(1).optional(),
    GMAIL_CLIENT_ID: z.string().min(1).optional(),
    GMAIL_CLIENT_SECRET: z.string().min(1).optional(),
    GMAIL_REFRESH_TOKEN: z.string().min(1).optional(),
    REVOLUT_API_TOKEN: z.string().min(1).optional(),
    FRAME_IO_TOKEN: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),

    // Seed / bootstrap for the first Kane admin (dev + first deploy only).
    ADMIN_BOOTSTRAP_EMAIL: z.email().optional(),
    ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
    ADMIN_BOOTSTRAP_NAME: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    // Optional so local/admin preview works before Cloudflare keys are pasted.
    // Forms already degrade when the site key is missing (TurnstileWidget).
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
    NEXT_PUBLIC_META_PIXEL_ID: z.string().min(1).optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
