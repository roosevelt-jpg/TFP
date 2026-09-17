import "server-only";

import { db } from "@/db";
import { resolvePersonCustomer } from "@/lib/identity/resolve";
import { resolveSecret } from "@/lib/secrets/store";
import { logger } from "@/lib/logger";

type CalendlyEvent = {
  uri: string;
  name?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
};

type CalendlyInvitee = {
  email?: string;
  name?: string;
  status?: string;
  timezone?: string;
};

/**
 * S8 Calendly — pull recent scheduled events into Call + ClientSession.
 * No-ops when CALENDLY_TOKEN is missing (credential-ready).
 */
export async function pullCalendlyEvents(): Promise<{
  pulled: number;
  skipped: boolean;
  reason?: string;
}> {
  const token =
    (await resolveSecret("CALENDLY_TOKEN")) ?? process.env.CALENDLY_TOKEN;
  if (!token) {
    return { pulled: 0, skipped: true, reason: "CALENDLY_TOKEN not configured" };
  }

  const started = Date.now();
  try {
    const meRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meRes.ok) {
      throw new Error(`Calendly users/me ${meRes.status}`);
    }
    const me = (await meRes.json()) as { resource?: { uri?: string } };
    const userUri = me.resource?.uri;
    if (!userUri) throw new Error("Calendly user uri missing");

    const minStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const maxStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const listUrl = new URL("https://api.calendly.com/scheduled_events");
    listUrl.searchParams.set("user", userUri);
    listUrl.searchParams.set("min_start_time", minStart);
    listUrl.searchParams.set("max_start_time", maxStart);
    listUrl.searchParams.set("count", "50");

    const eventsRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!eventsRes.ok) {
      throw new Error(`Calendly events ${eventsRes.status}`);
    }
    const eventsBody = (await eventsRes.json()) as {
      collection?: CalendlyEvent[];
    };
    const events = eventsBody.collection ?? [];
    let pulled = 0;

    for (const event of events) {
      const inviteesUrl = `${event.uri}/invitees`;
      const invRes = await fetch(inviteesUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!invRes.ok) continue;
      const invBody = (await invRes.json()) as { collection?: CalendlyInvitee[] };
      const invitee = invBody.collection?.[0];
      const email = invitee?.email?.toLowerCase();
      const scheduledAt = event.start_time
        ? new Date(event.start_time)
        : new Date();

      let personId: string | undefined;
      if (email) {
        const person = await resolvePersonCustomer({
          email,
          name: invitee?.name,
        });
        personId = person.id;
      }

      const calendlyEventId = event.uri.split("/").pop() ?? event.uri;
      const outcome =
        event.status === "canceled"
          ? "cancelled"
          : invitee?.status === "no_show"
            ? "no_show"
            : scheduledAt < new Date()
              ? "held"
              : "booked";

      const call = await db.call.upsert({
        where: { calendlyEventId },
        create: {
          calendlyEventId,
          personId,
          inviteeName: invitee?.name,
          inviteeEmail: email,
          eventType: event.name ?? event.event_type,
          scheduledAt,
          outcome,
          label: "verified",
          sourceFreshAt: new Date(),
        },
        update: {
          personId,
          inviteeName: invitee?.name,
          inviteeEmail: email,
          eventType: event.name ?? event.event_type,
          scheduledAt,
          outcome,
          sourceFreshAt: new Date(),
        },
      });

      if (personId) {
        const existingSession = await db.clientSession.findFirst({
          where: { callId: call.id },
        });
        if (!existingSession) {
          await db.clientSession.create({
            data: {
              personId,
              callId: call.id,
              title: event.name ?? "Calendly call",
              type: "coaching_call",
              status:
                outcome === "held"
                  ? "completed"
                  : outcome === "no_show"
                    ? "no_show"
                    : outcome === "cancelled"
                      ? "cancelled"
                      : "scheduled",
              scheduledAt,
              completedAt: outcome === "held" ? scheduledAt : null,
              createdBy: "calendly",
            },
          });
        }
      }
      pulled += 1;
    }

    await db.connectorRun.upsert({
      where: { sourceId: "S8" },
      create: {
        sourceId: "S8",
        name: "calendly",
        status: "healthy",
        lastRunAt: new Date(),
        lastSuccessAt: new Date(),
        scheduleNote: `pulled ${pulled}`,
      },
      update: {
        status: "healthy",
        lastRunAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
        scheduleNote: `pulled ${pulled} in ${Date.now() - started}ms`,
      },
    });

    return { pulled, skipped: false };
  } catch (error) {
    logger.error("Calendly pull failed", error);
    await db.connectorRun.upsert({
      where: { sourceId: "S8" },
      create: {
        sourceId: "S8",
        name: "calendly",
        status: "error",
        lastRunAt: new Date(),
        lastError: error instanceof Error ? error.message : String(error),
      },
      update: {
        status: "error",
        lastRunAt: new Date(),
        lastError: error instanceof Error ? error.message : String(error),
      },
    });
    return {
      pulled: 0,
      skipped: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
