import { env } from "@/env";
import {
  applyEmailWebhook,
  verifyResendWebhook,
} from "@/lib/funnel/email-webhook";
import { resolveSecret } from "@/lib/secrets/store";

/**
 * Resend delivery, bounce, complaint and unsubscribe callbacks.
 * Verify, persist, ack. No message sending on this request.
 */
export async function POST(request: Request) {
  const secret =
    (await resolveSecret("EMAIL_WEBHOOK_SECRET")) ?? env.EMAIL_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json(
      { error: "EMAIL_WEBHOOK_SECRET not configured" },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const check = verifyResendWebhook(payload, request.headers, secret);
  if (!check.ok) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await applyEmailWebhook({ svixId: check.id, body });
  return Response.json({ received: true, ...result });
}
