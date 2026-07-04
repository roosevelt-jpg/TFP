import * as Sentry from "@sentry/nextjs";

import { scrubEvent, scrubLog } from "@/lib/sentry-scrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1 : 0.1,
  enableLogs: true,
  // Keeps user data out of stack-frame locals; scrub events + logs regardless.
  includeLocalVariables: false,
  beforeSend: scrubEvent,
  beforeSendLog: scrubLog,
});
