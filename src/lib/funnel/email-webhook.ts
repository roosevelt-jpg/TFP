import { db } from "@/db";
import { verifyResendWebhook } from "@/lib/funnel/email-webhook-verify";
import { recordFunnelEvent } from "@/lib/funnel/records";

export { verifyResendWebhook };

const STATUS_BY_TYPE: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
  "email.opened": "opened",
};

export async function applyEmailWebhook(input: {
  svixId: string;
  body: unknown;
}) {
  const existing = await db.funnelEvent.findUnique({
    where: { eventId: `email:${input.svixId}` },
    select: { id: true },
  });
  if (existing) return { duplicate: true as const };

  const record = input.body as {
    type?: string;
    data?: { email_id?: string };
  };
  const type = record.type ?? "email.unknown";
  const emailId = record.data?.email_id;
  const status = STATUS_BY_TYPE[type];

  if (emailId && status) {
    await db.outboundMessage.updateMany({
      where: { providerMessageId: emailId },
      data: {
        status,
        ...(status === "bounced" || status === "complained"
          ? { failureReason: type }
          : {}),
      },
    });
  }

  await recordFunnelEvent({
    eventName: "email_delivery",
    source: "email",
    eventId: `email:${input.svixId}`,
    properties: { type, emailId: emailId ?? null, status: status ?? "ignored" },
  });

  return { duplicate: false as const, type, status: status ?? null };
}
