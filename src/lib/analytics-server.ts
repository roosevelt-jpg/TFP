import "server-only";

import { cookies } from "next/headers";
import { after } from "next/server";

import { PostHog } from "posthog-node";
import * as z from "zod";

import type { AnalyticsProperties } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import {
  resolveTrackingConsent,
  TRACKING_CONSENT_COOKIE,
} from "@/lib/tracking-consent";
import { env } from "@/env";

// posthog-js persists its state in a first-party cookie; reusing its
// distinct_id ties server events to the same person as the browser session,
// so funnels and person timelines stitch across the two.
const cookieSchema = z.object({ distinct_id: z.string().min(1) });

function decodeSafe(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function parsePosthogDistinctId(raw: string): string | undefined {
  try {
    const parsed = cookieSchema.safeParse(JSON.parse(decodeSafe(raw)));
    return parsed.success ? parsed.data.distinct_id : undefined;
  } catch {
    return undefined;
  }
}

// Server twin of client capture: survives ad blockers. Call within a request
// scope; delivery runs via after() so it never delays the response. The whole
// body is throw-safe by contract — tracking must never break a signup.
export async function trackServerEvent(
  event: string,
  properties: AnalyticsProperties,
): Promise<void> {
  try {
    const key = env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) return;

    const cookieStore = await cookies();

    // Same cookie + same default the client gate resolves through.
    const consent = resolveTrackingConsent(
      cookieStore.get(TRACKING_CONSENT_COOKIE)?.value,
    );
    if (consent !== "granted") return;

    const raw = cookieStore.get(`ph_${key}_posthog`)?.value;
    const parsedId = raw ? parsePosthogDistinctId(raw) : undefined;
    if (raw && !parsedId) {
      // Fires if a posthog-js upgrade changes the cookie format — the capture
      // below still counts, but funnels quietly unstitch without this signal.
      logger.warn("PostHog cookie present but unparseable", { event });
    }
    // No cookie (ad-blocked browser): a random id still counts the
    // conversion, just unlinked from the browser session.
    const distinctId = parsedId ?? crypto.randomUUID();

    after(async () => {
      try {
        const posthog = new PostHog(key, {
          host,
          flushAt: 1,
          flushInterval: 0,
        });
        posthog.capture({ distinctId, event, properties });
        await posthog.shutdown();
      } catch (error) {
        logger.error("PostHog server capture failed", error, { event });
      }
    });
  } catch (error) {
    logger.error("PostHog server capture setup failed", error, { event });
  }
}
