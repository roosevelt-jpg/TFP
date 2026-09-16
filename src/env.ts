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
    EMAIL_LOGO_URL: z.url(),
    EMAIL_COMMUNITY_URL: z.url(),
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

    // BetterStack heartbeat. Reconcile is the guarantee of last resort, so it
    // failing silently is the one failure nothing else would catch.
    RECONCILE_HEARTBEAT_URL: z.url().optional(),

    // Private store holding the master programme and each watermarked copy.
    FORMULA_BLOB_STORE_ID: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),

    // TFP Command (/admin) — Better Auth session secret (32+ chars).
    BETTER_AUTH_SECRET: z.string().min(32),

    // Telegram CTO channel. Optional until Phase 2; locked to Kane's chat.
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
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
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1),
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
