import "server-only";

import { db } from "@/db";

export type NotificationItem = {
  id: string;
  kind: "alert" | "approval" | "connector" | "content";
  severity: "p1" | "p2" | "p3" | "info";
  title: string;
  href: string;
  at: string;
};

export type NotificationFeed = {
  total: number;
  openAlerts: number;
  pendingApprovals: number;
  connectorIssues: number;
  contentAwaiting: number;
  items: NotificationItem[];
  updatedAt: string;
};

export const EMPTY_NOTIFICATION_FEED: NotificationFeed = {
  total: 0,
  openAlerts: 0,
  pendingApprovals: 0,
  connectorIssues: 0,
  contentAwaiting: 0,
  items: [],
  updatedAt: new Date(0).toISOString(),
};

/**
 * Keep queries sequential — local DB_POOL_MAX defaults to 1, and parallel
 * Prisma calls queue until connectionTimeoutMillis then throw.
 */
export async function getNotificationFeed(): Promise<NotificationFeed> {
  const alerts = await db.alert.findMany({
    where: { status: { in: ["open", "acknowledged"] } },
    orderBy: [{ severity: "asc" }, { firedAt: "desc" }],
    take: 12,
  });
  const approvals = await db.approvalRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const connectors = await db.connectorRun.findMany({
    where: { status: { in: ["error", "stale"] } },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
  const posts = await db.postCard.findMany({
    where: { status: { in: ["awaiting_kane", "compliance", "changes_requested", "ready"] } },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });

  const openAlerts = alerts.filter((a) => a.status === "open").length;
  const pendingApprovals = approvals.length;
  const connectorIssues = connectors.length;
  const contentAwaiting = posts.length;

  const items: NotificationItem[] = [
    ...alerts.map((a) => ({
      id: `alert:${a.id}`,
      kind: "alert" as const,
      severity: a.severity as "p1" | "p2" | "p3",
      title: a.title,
      href: "/admin/alerts",
      at: a.firedAt.toISOString(),
    })),
    ...approvals.map((a) => ({
      id: `approval:${a.id}`,
      kind: "approval" as const,
      severity: "p2" as const,
      title: `Approval: ${a.action}`,
      href: "/admin/alerts",
      at: a.createdAt.toISOString(),
    })),
    ...connectors.map((c) => ({
      id: `connector:${c.id}`,
      kind: "connector" as const,
      severity: "p3" as const,
      title: `${c.name} · ${c.status}${c.lastError ? ` — ${c.lastError.slice(0, 80)}` : ""}`,
      href: "/admin/integrations",
      at: c.updatedAt.toISOString(),
    })),
    ...posts.map((p) => ({
      id: `content:${p.id}`,
      kind: "content" as const,
      severity: "p2" as const,
      title: `Content ${p.status}: ${p.asset.title}`,
      href: "/admin/content",
      at: p.updatedAt.toISOString(),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 20);

  return {
    total: openAlerts + pendingApprovals + connectorIssues + contentAwaiting,
    openAlerts,
    pendingApprovals,
    connectorIssues,
    contentAwaiting,
    items,
    updatedAt: new Date().toISOString(),
  };
}

export async function getNotificationFingerprint(): Promise<string> {
  const feed = await getNotificationFeed();
  return [
    feed.openAlerts,
    feed.pendingApprovals,
    feed.connectorIssues,
    feed.contentAwaiting,
    feed.items[0]?.id ?? "",
    feed.items[0]?.at ?? "",
  ].join("|");
}

export async function getNotificationFeedSafe(): Promise<NotificationFeed> {
  try {
    return await getNotificationFeed();
  } catch {
    return EMPTY_NOTIFICATION_FEED;
  }
}
