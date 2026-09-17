import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/db";

export type FunnelEventName =
  | "landing_view"
  | "cta_clicked"
  | "lead_submitted"
  | "checkout_started"
  | "payment_succeeded"
  | "payment_failed"
  | "checkout_abandoned"
  | "programme_activated"
  | "onboarding_incomplete"
  | "renewal_approaching"
  | "subscription_cancelled"
  | "nurture_sent"
  | "stack_upsell_clicked";

export async function recordFunnelEvent(input: {
  eventName: FunnelEventName | string;
  customerId?: string | null;
  waitlistId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  source: "web" | "stripe" | "meta" | "telegram" | "email" | "scheduler" | "admin";
  properties?: Record<string, unknown>;
  occurredAt?: Date;
  /** Stable id for idempotency (defaults to random). */
  eventId?: string;
}) {
  const eventId = input.eventId ?? randomUUID();
  try {
    await db.funnelEvent.create({
      data: {
        eventId,
        eventName: input.eventName,
        customerId: input.customerId ?? undefined,
        waitlistId: input.waitlistId ?? undefined,
        anonymousId: input.anonymousId ?? undefined,
        sessionId: input.sessionId ?? undefined,
        correlationId: input.correlationId ?? undefined,
        source: input.source,
        properties:
          input.properties === undefined
            ? undefined
            : (input.properties as Prisma.InputJsonValue),
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  } catch {
    // Unique eventId = already recorded; safe to ignore.
  }
  return eventId;
}

export async function recordConsent(input: {
  customerId?: string | null;
  waitlistId?: string | null;
  channel: "email" | "whatsapp" | "telegram" | "marketing" | "programme";
  purpose: string;
  status?: "granted" | "withdrawn";
  source: string;
  policyVersion: string;
  ipAddress?: string | null;
  capturedAt?: Date;
}) {
  return db.consentRecord.create({
    data: {
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      channel: input.channel,
      purpose: input.purpose,
      status: input.status ?? "granted",
      source: input.source,
      policyVersion: input.policyVersion,
      capturedAt: input.capturedAt ?? new Date(),
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}

export async function upsertWorkflow(input: {
  dedupeKey: string;
  workflowKey: string;
  customerId?: string | null;
  waitlistId?: string | null;
  email?: string | null;
  triggerEventId?: string | null;
  currentStep?: string | null;
  state?: string;
  nextActionAt?: Date | null;
}) {
  return db.workflowExecution.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      dedupeKey: input.dedupeKey,
      workflowKey: input.workflowKey,
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      email: input.email ?? undefined,
      triggerEventId: input.triggerEventId ?? undefined,
      currentStep: input.currentStep ?? undefined,
      state: input.state ?? "running",
      nextActionAt: input.nextActionAt ?? undefined,
    },
    update: {
      currentStep: input.currentStep ?? undefined,
      state: input.state ?? undefined,
      nextActionAt: input.nextActionAt ?? undefined,
      attemptCount: { increment: 1 },
    },
  });
}

export async function stopWorkflow(dedupeKey: string, reason?: string) {
  await db.workflowExecution.updateMany({
    where: { dedupeKey, state: "running" },
    data: {
      state: "stopped",
      lastError: reason ?? null,
      nextActionAt: null,
    },
  });
}

export async function completeWorkflow(dedupeKey: string) {
  await db.workflowExecution.updateMany({
    where: { dedupeKey },
    data: { state: "completed", nextActionAt: null },
  });
}

export async function logOutboundMessage(input: {
  customerId?: string | null;
  waitlistId?: string | null;
  workflowExecutionId?: string | null;
  channel: string;
  templateId?: string;
  providerMessageId?: string | null;
  status: string;
  failureReason?: string | null;
}) {
  return db.outboundMessage.create({
    data: {
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      workflowExecutionId: input.workflowExecutionId ?? undefined,
      channel: input.channel,
      templateId: input.templateId,
      providerMessageId: input.providerMessageId ?? undefined,
      status: input.status,
      failureReason: input.failureReason ?? undefined,
      sentAt: input.status === "sent" ? new Date() : undefined,
    },
  });
}

export async function linkChannelIdentity(input: {
  channel: "telegram" | "instagram" | "whatsapp" | "email";
  externalUserId: string;
  customerId?: string | null;
  waitlistId?: string | null;
  address?: string | null;
  inbound?: boolean;
}) {
  return db.channelIdentity.upsert({
    where: {
      channel_externalUserId: {
        channel: input.channel,
        externalUserId: input.externalUserId,
      },
    },
    create: {
      channel: input.channel,
      externalUserId: input.externalUserId,
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      address: input.address ?? undefined,
      lastInboundAt: input.inbound ? new Date() : undefined,
      lastOutboundAt: input.inbound ? undefined : new Date(),
    },
    update: {
      customerId: input.customerId ?? undefined,
      waitlistId: input.waitlistId ?? undefined,
      address: input.address ?? undefined,
      status: "active",
      ...(input.inbound
        ? { lastInboundAt: new Date() }
        : { lastOutboundAt: new Date() }),
    },
  });
}
