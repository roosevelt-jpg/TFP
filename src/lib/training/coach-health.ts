import "server-only";

import { db } from "@/db";

export type CoachHealthStatus = "healthy" | "degraded" | "unknown";

export type CoachHealth = {
  status: CoachHealthStatus;
  lastTemplateSendAt: Date | null;
  lastInboundAt: Date | null;
  /** Human-readable reason for the status. */
  detail: string;
};

/** Fresh enough for healthy: activity within this window. */
const HEALTHY_WITHIN_MS = 36 * 60 * 60_000;
/** Beyond this with no activity → degraded (when we have any history). */
const STALE_AFTER_MS = 72 * 60 * 60_000;

/**
 * WhatsApp Performance Coach health from last template send + inbound activity.
 * Also treats open template-rejection alerts and GHL connector errors as degraded.
 */
export async function getWhatsAppCoachHealth(
  now = new Date(),
): Promise<CoachHealth> {
  const [lastSend, lastInbound, openReject, ghlConnector] = await Promise.all([
    db.outboundMessage.findFirst({
      where: {
        channel: "whatsapp",
        templateId: { not: null },
        status: { in: ["sent", "delivered", "read"] },
      },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      select: { sentAt: true, createdAt: true },
    }),
    db.leadThread.findFirst({
      where: { channel: "whatsapp", lastInboundAt: { not: null } },
      orderBy: { lastInboundAt: "desc" },
      select: { lastInboundAt: true },
    }),
    db.alert.findFirst({
      where: {
        ruleId: "whatsapp_template_rejected",
        status: { in: ["open", "acknowledged"] },
      },
      orderBy: { firedAt: "desc" },
      select: { id: true, title: true, firedAt: true },
    }),
    db.connectorRun.findUnique({
      where: { sourceId: "S5" },
      select: {
        status: true,
        lastSuccessAt: true,
        lastError: true,
      },
    }),
  ]);

  const lastTemplateSendAt =
    lastSend?.sentAt ?? lastSend?.createdAt ?? null;
  const lastInboundAt = lastInbound?.lastInboundAt ?? null;

  if (openReject) {
    return {
      status: "degraded",
      lastTemplateSendAt,
      lastInboundAt,
      detail: `Open template rejection: ${openReject.title}`,
    };
  }

  if (ghlConnector?.status === "error") {
    return {
      status: "degraded",
      lastTemplateSendAt,
      lastInboundAt,
      detail: ghlConnector.lastError
        ? `GHL connector error: ${ghlConnector.lastError.slice(0, 120)}`
        : "GHL connector in error state",
    };
  }

  const activityAt = latestDate(lastTemplateSendAt, lastInboundAt);
  if (!activityAt) {
    return {
      status: "unknown",
      lastTemplateSendAt,
      lastInboundAt,
      detail: "No WhatsApp template sends or inbound activity recorded yet",
    };
  }

  const ageMs = now.getTime() - activityAt.getTime();
  if (ageMs <= HEALTHY_WITHIN_MS) {
    return {
      status: "healthy",
      lastTemplateSendAt,
      lastInboundAt,
      detail: "Recent template send or inbound activity",
    };
  }
  if (ageMs > STALE_AFTER_MS) {
    return {
      status: "degraded",
      lastTemplateSendAt,
      lastInboundAt,
      detail: `No coach activity for ${Math.round(ageMs / 3_600_000)}h`,
    };
  }

  // Between healthy and stale windows — still ok, slightly aged.
  return {
    status: "healthy",
    lastTemplateSendAt,
    lastInboundAt,
    detail: "Activity within acceptable window",
  };
}

function latestDate(a: Date | null, b: Date | null): Date | null {
  if (a && b) return a.getTime() >= b.getTime() ? a : b;
  return a ?? b;
}
