import * as Sentry from "@sentry/nextjs";

import { scrubString } from "@/lib/sentry-scrub";

type Context = Record<string, unknown>;

function line(level: string, message: string, context?: Context) {
  const clean = scrubString(message);
  if (process.env.NODE_ENV === "production") {
    console[level === "error" ? "error" : "log"](
      JSON.stringify({ level, message: clean, ...context }),
    );
  } else {
    console[level === "error" ? "error" : "log"](
      `[${level}] ${clean}`,
      context ?? "",
    );
  }
  return clean;
}

export const logger = {
  info(message: string, context?: Context) {
    line("info", message, context);
  },
  warn(message: string, context?: Context) {
    Sentry.logger.warn(line("warn", message, context), context);
  },
  error(message: string, error?: unknown, context?: Context) {
    const clean = line("error", message, context);
    if (error !== undefined) {
      // Sentry gets the error either way, but outside production it also has to
      // reach the terminal: a headline with no cause is undebuggable locally.
      if (process.env.NODE_ENV !== "production") console.error(error);
      Sentry.captureException(error, { extra: { message: clean, ...context } });
    } else {
      Sentry.captureMessage(clean, "error");
    }
  },
};
