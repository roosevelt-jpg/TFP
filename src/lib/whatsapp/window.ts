import "server-only";

import { db } from "@/db";

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Spec §11 — free-form replies only inside the 24h customer-care window. */
export async function isInsideWhatsAppServiceWindow(
  externalUserId: string,
): Promise<boolean> {
  const identity = await db.channelIdentity.findUnique({
    where: {
      channel_externalUserId: {
        channel: "whatsapp",
        externalUserId,
      },
    },
    select: { lastInboundAt: true },
  });
  if (!identity?.lastInboundAt) return false;
  return Date.now() - identity.lastInboundAt.getTime() < SERVICE_WINDOW_MS;
}
