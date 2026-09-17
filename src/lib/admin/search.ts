import "server-only";

import { db } from "@/db";
import { ADMIN_NAV } from "@/lib/admin/nav";
import type { AdminSearchHit } from "@/lib/admin/search-types";

export type { AdminSearchHit } from "@/lib/admin/search-types";

const LIMIT = 6;

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function clientsHref(id: string) {
  return `/admin/clients/${id}`;
}

function moneyHref(q: string) {
  return `/admin/money?q=${encodeURIComponent(q)}`;
}

function emailHref(q: string) {
  return `/admin/email?q=${encodeURIComponent(q)}`;
}

function supplementsHref(q: string) {
  return `/admin/supplements?q=${encodeURIComponent(q)}`;
}

function coachingHref(q: string) {
  return `/admin/coaching?q=${encodeURIComponent(q)}`;
}

function fulfilmentHref(q: string) {
  return `/admin/fulfilment?q=${encodeURIComponent(q)}`;
}

function alertsHref(q: string) {
  return `/admin/alerts?q=${encodeURIComponent(q)}`;
}

function contentHref(q: string) {
  return `/admin/content?q=${encodeURIComponent(q)}`;
}

function teamHref(q: string) {
  return `/admin/team?q=${encodeURIComponent(q)}`;
}

function pence(n: number) {
  return `£${(n / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

/** Cross-warehouse + nav search for the Command topbar. */
export async function searchAdmin(query: string): Promise<AdminSearchHit[]> {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return [];

  const navHits: AdminSearchHit[] = ADMIN_NAV.flatMap((group) =>
    group.items
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q.toLowerCase()) ||
          group.group.toLowerCase().includes(q.toLowerCase()),
      )
      .map((item) => ({
        id: `nav:${item.id}`,
        type: "Page",
        title: item.label,
        subtitle: group.group,
        href: item.href,
      })),
  );

  const [people, customers, orders, threads, alerts, calls, stock, dues, affiliates, assets] =
    await Promise.all([
      db.personCustomer.findMany({
        where: {
          OR: [
            { email: contains(q) },
            { name: contains(q) },
            { phone: contains(q) },
            { igHandle: contains(q) },
            { shopifyId: contains(q) },
            { stripeId: contains(q) },
          ],
        },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
      }),
      db.customer.findMany({
        where: {
          OR: [
            { email: contains(q) },
            { name: contains(q) },
            { whatsapp: contains(q) },
          ],
        },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
      }),
      db.warehouseOrder.findMany({
        where: {
          OR: [
            { shopifyOrderId: contains(q) },
            { orderName: contains(q) },
            { person: { email: contains(q) } },
            { person: { name: contains(q) } },
            { lines: { some: { sku: contains(q) } } },
            { lines: { some: { title: contains(q) } } },
          ],
        },
        include: { person: true },
        take: LIMIT,
        orderBy: { paidAt: "desc" },
      }),
      db.leadThread.findMany({
        where: {
          OR: [
            { contactName: contains(q) },
            { snippet: contains(q) },
            { externalId: contains(q) },
            { person: { email: contains(q) } },
            { person: { name: contains(q) } },
          ],
        },
        take: LIMIT,
        orderBy: { lastInboundAt: "desc" },
      }),
      db.alert.findMany({
        where: {
          OR: [{ title: contains(q) }, { ruleId: contains(q) }, { threadKey: contains(q) }],
        },
        take: LIMIT,
        orderBy: { firedAt: "desc" },
      }),
      db.call.findMany({
        where: {
          OR: [
            { inviteeName: contains(q) },
            { inviteeEmail: contains(q) },
            { eventType: contains(q) },
            { setter: contains(q) },
            { person: { email: contains(q) } },
            { person: { name: contains(q) } },
          ],
        },
        take: LIMIT,
        orderBy: { scheduledAt: "desc" },
      }),
      db.stockItem.findMany({
        where: {
          OR: [{ sku: contains(q) }, { title: contains(q) }],
        },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
      }),
      db.paymentDue.findMany({
        where: {
          OR: [{ payee: contains(q) }, { category: contains(q) }],
        },
        take: LIMIT,
        orderBy: { dueDate: "desc" },
      }),
      db.affiliate.findMany({
        where: {
          OR: [
            { name: contains(q) },
            { email: contains(q) },
            { channel: contains(q) },
            { codes: { some: { code: contains(q) } } },
          ],
        },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
      }),
      db.contentAsset.findMany({
        where: {
          OR: [
            { title: contains(q) },
            { brief: contains(q) },
            { uploader: contains(q) },
          ],
        },
        take: LIMIT,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

  const hits: AdminSearchHit[] = [
    ...navHits,
    ...people.map((p) => ({
      id: `person:${p.id}`,
      type: "Person",
      title: p.name?.trim() || p.email,
      subtitle: [p.email, p.phone, p.igHandle].filter(Boolean).join(" · "),
      href: clientsHref(p.id),
    })),
    ...customers.map((c) => ({
      id: `customer:${c.id}`,
      type: "Customer",
      title: c.name,
      subtitle: `${c.email} · ${c.whatsapp}`,
      href: clientsHref(c.id),
    })),
    ...orders.map((o) => ({
      id: `order:${o.id}`,
      type: "Order",
      title: o.orderName || o.shopifyOrderId,
      subtitle: [
        o.shopifyOrderId,
        o.person?.email ?? o.person?.name,
        pence(o.netPence),
        o.businessLine,
      ]
        .filter(Boolean)
        .join(" · "),
      href:
        o.businessLine === "coaching" || o.businessLine === "training"
          ? coachingHref(o.shopifyOrderId)
          : supplementsHref(o.shopifyOrderId),
    })),
    ...threads.map((t) => ({
      id: `thread:${t.id}`,
      type: "Thread",
      title: t.contactName || t.externalId,
      subtitle: `${t.channel}${t.snippet ? ` · ${t.snippet.slice(0, 80)}` : ""}`,
      href: emailHref(t.contactName || t.externalId),
    })),
    ...alerts.map((a) => ({
      id: `alert:${a.id}`,
      type: "Alert",
      title: a.title,
      subtitle: `${a.severity.toUpperCase()} · ${a.ruleId} · ${a.status}`,
      href: alertsHref(a.ruleId),
    })),
    ...calls.map((c) => ({
      id: `call:${c.id}`,
      type: "Call",
      title: c.inviteeName || c.inviteeEmail || "Call",
      subtitle: [
        c.inviteeEmail,
        c.eventType,
        c.scheduledAt.toLocaleString("en-GB"),
      ]
        .filter(Boolean)
        .join(" · "),
      href: coachingHref(c.inviteeEmail || c.inviteeName || q),
    })),
    ...stock.map((s) => ({
      id: `stock:${s.id}`,
      type: "Stock",
      title: s.title,
      subtitle: `${s.sku} · ${s.onHand} on hand`,
      href: fulfilmentHref(s.sku),
    })),
    ...dues.map((d) => ({
      id: `due:${d.id}`,
      type: "Payment",
      title: d.payee,
      subtitle: `${pence(d.amountPence)} · ${d.category} · ${d.status}`,
      href: moneyHref(d.payee),
    })),
    ...affiliates.map((a) => ({
      id: `affiliate:${a.id}`,
      type: "Affiliate",
      title: a.name,
      subtitle: [a.email, a.channel].filter(Boolean).join(" · "),
      href: teamHref(a.name),
    })),
    ...assets.map((a) => ({
      id: `asset:${a.id}`,
      type: "Content",
      title: a.title,
      subtitle: `${a.state} · ${a.uploader}`,
      href: contentHref(a.title),
    })),
  ];

  // Prefer exact-ish nav, then people, then the rest — keep UI compact.
  return hits.slice(0, 24);
}
