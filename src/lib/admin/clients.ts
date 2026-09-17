import "server-only";

import { db } from "@/db";
import { resolvePersonCustomer } from "@/lib/identity/resolve";
import { STAFF_PEOPLE } from "@/lib/admin/staff";
import type {
  ConsentRecord,
  FunnelEvent,
  OutboundMessage,
} from "@/generated/prisma/client";

export type ClientListRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  joinedAt: Date;
  tier: string | null;
  planStatus: string | null;
  assignedStaff: string[];
  sessionsTaken: number;
};

function gbp(pence: number) {
  return `£${(pence / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Ensure programme Customer has a linked PersonCustomer hub row. */
export async function ensurePersonForCustomer(customerId: string) {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer) throw new Error("Customer not found");

  const existing = await db.personCustomer.findFirst({
    where: {
      OR: [
        { customerId },
        { email: customer.email.toLowerCase() },
        { stripeId: customer.stripeCustomerId },
        { phone: customer.whatsapp },
      ],
    },
  });

  if (existing) {
    return db.personCustomer.update({
      where: { id: existing.id },
      data: {
        customerId,
        email: customer.email.toLowerCase(),
        phone: customer.whatsapp,
        name: customer.name,
        stripeId: customer.stripeCustomerId,
      },
    });
  }

  const person = await resolvePersonCustomer({
    email: customer.email,
    phone: customer.whatsapp,
    name: customer.name,
    stripeId: customer.stripeCustomerId,
  });

  return db.personCustomer.update({
    where: { id: person.id },
    data: { customerId },
  });
}

/** Create / update a CRM person for a waitlist lead (pre-purchase). */
export async function ensurePersonForWaitlist(waitlistId: string) {
  const lead = await db.waitlist.findUnique({ where: { id: waitlistId } });
  if (!lead) throw new Error("Waitlist lead not found");

  const person = await resolvePersonCustomer({
    email: lead.email,
    phone: lead.whatsapp,
    name: lead.name,
  });

  return db.personCustomer.update({
    where: { id: person.id },
    data: {
      bioSummary:
        person.bioSummary ??
        ([
          lead.goal ? `Goal: ${lead.goal}` : null,
          lead.level ? `Level: ${lead.level}` : null,
          lead.injuries ? `Injuries: ${lead.injuries}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || undefined),
    },
  });
}

/** Link any programme buyers that still lack a PersonCustomer row. */
export async function backfillClientLinks(limit = 100) {
  const orphans = await db.customer.findMany({
    where: { person: null },
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  for (const c of orphans) {
    await ensurePersonForCustomer(c.id);
  }
  return orphans.length;
}

/** Resolve a CRM person by person id or linked customer id. */
export async function resolveClientPersonId(id: string): Promise<string | null> {
  const byPerson = await db.personCustomer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (byPerson) return byPerson.id;

  const byCustomer = await db.personCustomer.findFirst({
    where: { customerId: id },
    select: { id: true },
  });
  if (byCustomer) return byCustomer.id;

  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) return null;
  const linked = await ensurePersonForCustomer(customer.id);
  return linked.id;
}

export async function listClients(opts?: {
  q?: string;
  take?: number;
}): Promise<ClientListRow[]> {
  const q = opts?.q?.trim();
  const take = opts?.take ?? 80;

  const people = await db.personCustomer.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { igHandle: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      customer: {
        include: {
          subscriptions: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      },
      enrolments: {
        where: { status: "active" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      assignments: {
        where: { endedAt: null },
        orderBy: { assignedAt: "desc" },
      },
      sessions: {
        where: { status: "completed" },
        select: { id: true },
      },
      calls: {
        where: { outcome: { in: ["held", "closed"] } },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take,
  });

  return people.map((p) => {
    const sub = p.customer?.subscriptions[0];
    const enrolment = p.enrolments[0];
    return {
      id: p.id,
      name: p.name?.trim() || p.customer?.name || p.email,
      email: p.email,
      phone: p.phone ?? p.customer?.whatsapp ?? null,
      image: p.image,
      joinedAt: p.customer?.createdAt ?? p.createdAt,
      tier: enrolment?.tier ?? sub?.stripePriceId ?? null,
      planStatus: sub?.status ?? enrolment?.status ?? null,
      assignedStaff: p.assignments.map((a) => a.staffPersonKey),
      sessionsTaken: p.sessions.length + p.calls.length,
    };
  });
}

export type Client360 = Awaited<ReturnType<typeof getClient360>>;

export async function getClient360(personId: string) {
  const person = await db.personCustomer.findUnique({
    where: { id: personId },
    include: {
      customer: {
        include: {
          coaching: true,
          waitlist: true,
          purchases: { orderBy: { createdAt: "desc" } },
          subscriptions: { orderBy: { updatedAt: "desc" } },
        },
      },
      enrolments: { orderBy: { startDate: "desc" } },
      orders: {
        include: { lines: true, fulfilment: true },
        orderBy: { paidAt: "desc" },
        take: 40,
      },
      payments: { orderBy: { paidAt: "desc" }, take: 40 },
      calls: { orderBy: { scheduledAt: "desc" }, take: 40 },
      sessions: { orderBy: { scheduledAt: "desc" }, take: 60 },
      assignments: { orderBy: { assignedAt: "desc" } },
      notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 50 },
      leadThreads: { orderBy: { lastInboundAt: "desc" }, take: 30 },
      fulfilments: { orderBy: { paidAt: "desc" }, take: 20 },
    },
  });

  if (!person) return null;

  const customerId = person.customerId ?? person.customer?.id ?? null;
  const waitlistId = person.customer?.waitlistId ?? null;

  const [consents, funnelEvents, outbound, channelIdentities] =
    await Promise.all([
      db.consentRecord.findMany({
        where: {
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(waitlistId ? [{ waitlistId }] : []),
          ],
        },
        orderBy: { capturedAt: "desc" },
        take: 40,
      }),
      db.funnelEvent.findMany({
        where: {
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(waitlistId ? [{ waitlistId }] : []),
          ],
        },
        orderBy: { occurredAt: "desc" },
        take: 60,
      }),
      db.outboundMessage.findMany({
        where: {
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(waitlistId ? [{ waitlistId }] : []),
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      db.channelIdentity.findMany({
        where: {
          OR: [
            ...(customerId ? [{ customerId }] : []),
            ...(waitlistId ? [{ waitlistId }] : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  // Ensure WhatsApp channel identity surfaces from customer phone.
  const channels = [...channelIdentities];
  const phone = person.phone ?? person.customer?.whatsapp;
  if (phone && !channels.some((c) => c.channel === "whatsapp")) {
    channels.push({
      id: "derived-whatsapp",
      customerId,
      waitlistId,
      channel: "whatsapp",
      externalUserId: phone,
      address: phone,
      status: "active",
      lastInboundAt: null,
      lastOutboundAt: null,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
  }
  if (person.igHandle && !channels.some((c) => c.channel === "instagram")) {
    channels.push({
      id: "derived-instagram",
      customerId,
      waitlistId,
      channel: "instagram",
      externalUserId: person.igHandle,
      address: `@${person.igHandle.replace(/^@/, "")}`,
      status: "active",
      lastInboundAt: null,
      lastOutboundAt: null,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
  }

  const coaching = person.customer?.coaching;
  const waitlist = person.customer?.waitlist;
  const bio = {
    goal: coaching?.goal ?? waitlist?.goal ?? null,
    level: coaching?.level ?? waitlist?.level ?? null,
    sex: coaching?.sex ?? waitlist?.sex ?? null,
    age: coaching?.age ?? waitlist?.age ?? null,
    heightCm: coaching?.heightCm ?? waitlist?.heightCm ?? null,
    weightKg: coaching?.weightKg ?? waitlist?.weightKg ?? null,
    goalWeightKg: coaching?.goalWeightKg ?? waitlist?.goalWeightKg ?? null,
    diet: coaching?.diet ?? waitlist?.diet ?? null,
    injuries: coaching?.injuries ?? waitlist?.injuries ?? null,
    country: person.country,
    timezone: person.timezone,
    dateOfBirth: person.dateOfBirth,
    bioSummary: person.bioSummary,
    coachingCompletedAt: coaching?.completedAt ?? null,
  };

  const purchaseTotal = (person.customer?.purchases ?? []).reduce(
    (sum, p) => sum + (p.status === "paid" ? p.amountTotal : 0),
    0,
  );
  const warehousePaid = person.payments
    .filter((p) => p.status === "succeeded" || p.status === "paid")
    .reduce((sum, p) => sum + p.amountPence, 0);

  const completedSessions =
    person.sessions.filter((s) => s.status === "completed").length +
    person.calls.filter((c) => c.outcome === "held" || c.outcome === "closed")
      .length;

  const timeline = buildTimeline({
    funnelEvents,
    outbound,
    purchases: person.customer?.purchases ?? [],
    sessions: person.sessions,
    calls: person.calls,
    notes: person.notes,
    threads: person.leadThreads,
    consents,
  });

  const activeAssignments = person.assignments.filter((a) => !a.endedAt);
  const staffLabels = Object.fromEntries(
    STAFF_PEOPLE.map((s) => [s.personKey, s.name]),
  );

  return {
    person: {
      id: person.id,
      email: person.email,
      phone: phone ?? null,
      name: person.name?.trim() || person.customer?.name || person.email,
      image: person.image,
      shopifyId: person.shopifyId,
      stripeId: person.stripeId ?? person.customer?.stripeCustomerId ?? null,
      ghlId: person.ghlId,
      igHandle: person.igHandle,
      joinedAt: person.customer?.createdAt ?? person.createdAt,
      customerId,
      waitlistId,
    },
    bio,
    tiers: {
      enrolments: person.enrolments,
      subscriptions: person.customer?.subscriptions ?? [],
      activeTier: [
        ...person.enrolments
          .filter((e) => e.status === "active")
          .map((e) => `${e.line}${e.tier ? ` · ${e.tier}` : ""}`),
        ...(person.customer?.subscriptions ?? [])
          .filter((s) => s.status === "active" || s.status === "trialing")
          .map((s) => s.stripePriceId),
      ],
    },
    assignedStaff: activeAssignments.map((a) => ({
      ...a,
      staffName: staffLabels[a.staffPersonKey] ?? a.staffPersonKey,
    })),
    allAssignments: person.assignments,
    sessionsTaken: completedSessions,
    sessions: person.sessions,
    calls: person.calls,
    payments: {
      purchases: person.customer?.purchases ?? [],
      warehouse: person.payments,
      lifetimeLabel: gbp(purchaseTotal + warehousePaid),
      lifetimePence: purchaseTotal + warehousePaid,
    },
    orders: person.orders,
    fulfilments: person.fulfilments,
    consents,
    channels,
    notes: person.notes,
    threads: person.leadThreads,
    timeline,
    attribution: waitlist
      ? {
          utmSource: waitlist.utmSource,
          utmMedium: waitlist.utmMedium,
          utmCampaign: waitlist.utmCampaign,
          referrer: waitlist.referrer,
          landingPath: waitlist.landingPath,
        }
      : null,
  };
}

type TimelineItem = {
  id: string;
  at: Date;
  kind: string;
  title: string;
  detail?: string;
};

function buildTimeline(input: {
  funnelEvents: FunnelEvent[];
  outbound: OutboundMessage[];
  purchases: { id: string; amountTotal: number; currency: string; status: string; purchasedAt: Date | null; createdAt: Date; ref: string }[];
  sessions: { id: string; title: string; scheduledAt: Date; status: string; type: string }[];
  calls: { id: string; inviteeName: string | null; eventType: string | null; scheduledAt: Date; outcome: string }[];
  notes: { id: string; body: string; createdAt: Date; authorEmail: string }[];
  threads: { id: string; channel: string; snippet: string | null; lastInboundAt: Date | null; createdAt: Date }[];
  consents: ConsentRecord[];
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const e of input.funnelEvents) {
    items.push({
      id: `fe:${e.id}`,
      at: e.occurredAt,
      kind: "event",
      title: e.eventName,
      detail: e.source,
    });
  }
  for (const m of input.outbound) {
    items.push({
      id: `om:${m.id}`,
      at: m.sentAt ?? m.createdAt,
      kind: "message",
      title: `${m.channel} · ${m.status}`,
      detail: m.templateId ?? undefined,
    });
  }
  for (const p of input.purchases) {
    items.push({
      id: `pu:${p.id}`,
      at: p.purchasedAt ?? p.createdAt,
      kind: "payment",
      title: `Purchase ${p.ref} · ${gbp(p.amountTotal)}`,
      detail: p.status,
    });
  }
  for (const s of input.sessions) {
    items.push({
      id: `ss:${s.id}`,
      at: s.scheduledAt,
      kind: "session",
      title: s.title,
      detail: `${s.type} · ${s.status}`,
    });
  }
  for (const c of input.calls) {
    items.push({
      id: `ca:${c.id}`,
      at: c.scheduledAt,
      kind: "session",
      title: c.eventType || "Call",
      detail: c.outcome,
    });
  }
  for (const n of input.notes) {
    items.push({
      id: `no:${n.id}`,
      at: n.createdAt,
      kind: "note",
      title: `Note by ${n.authorEmail}`,
      detail: n.body.slice(0, 120),
    });
  }
  for (const t of input.threads) {
    items.push({
      id: `th:${t.id}`,
      at: t.lastInboundAt ?? t.createdAt,
      kind: "dm",
      title: `${t.channel} thread`,
      detail: t.snippet?.slice(0, 120) ?? undefined,
    });
  }
  for (const c of input.consents) {
    items.push({
      id: `co:${c.id}`,
      at: c.capturedAt,
      kind: "consent",
      title: `${c.channel} · ${c.purpose} · ${c.status}`,
      detail: c.source,
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 80);
}