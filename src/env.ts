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
    RESEND_API_KEY: z.string().min(1),
    RESEND_FROM: z.string().min(1),
    EMAIL_LOGO_URL: z.url(),
    EMAIL_COMMUNITY_URL: z.url(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
