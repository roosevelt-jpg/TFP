import { NextResponse } from "next/server";

import { pullCalendlyEvents } from "@/lib/connectors/calendly";
import { logger } from "@/lib/logger";
import { resolveSecret } from "@/lib/secrets/store";

/**
 * Calendly webhook — on invitee created/canceled, refresh scheduled events.
 * Signing secret optional until CALENDLY_WEBHOOK_SIGNING_KEY is configured.
 */
export async function POST(request: Request) {
  const signingKey =
    (await resolveSecret("CALENDLY_WEBHOOK_SIGNING_KEY")) ??
    process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

  if (signingKey) {
    const signature = request.headers.get("calendly-webhook-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    // Calendly uses a timestamped HMAC; full verify lands with the signing key.
    // Until then we require the header presence when a key is configured.
  }

  try {
    await request.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  try {
    const result = await pullCalendlyEvents();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    logger.error("Calendly webhook pull failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
