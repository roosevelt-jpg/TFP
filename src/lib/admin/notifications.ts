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

export async function getNotificationFeed(): Promise<NotificationFeed> {
  const [openAlerts, pendingApprovals, connectorIssues, contentAwaiting, alerts, approvals, connectors, posts] =
    await Promise.all([
      db.alert.count({ where: { status: "open" } }),
      db.approvalRequest.count({ where: { status: "pending" } }),
      db.connectorRun.count({
        where: { status: { in: ["error", "stale"] } },
      }),
      db.postCard.count({
        where: { status: { in: ["awaiting_kane", "compliance"] } },
      }),
      db.alert.findMany({
        where: { status: { in: ["open", "acknowledged"] } },
        orderBy: [{ severity: "asc" }, { firedAt: "desc" }],
        take: 8,
      }),
      db.approvalRequest.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.connectorRun.findMany({
        where: { status: { in: ["error", "stale"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.postCard.findMany({
        where: { status: { in: ["awaiting_kane", "compliance"] } },
        include: { asset: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

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

  const total =
    openAlerts + pendingApprovals + connectorIssues + contentAwaiting;

  return {
    total,
    openAlerts,
    pendingApprovals,
    connectorIssues,
    contentAwaiting,
    items,
    updatedAt: new Date().toISOString(),
  };
}

export async function getNotificationFingerprint(): Promise<string> {
  const [openAlerts, pendingApprovals, connectorIssues, contentAwaiting, latestAlert, latestApproval] =
    await Promise.all([
      db.alert.count({ where: { status: "open" } }),
      db.approvalRequest.count({ where: { status: "pending" } }),
      db.connectorRun.count({
        where: { status: { in: ["error", "stale"] } },
      }),
      db.postCard.count({
        where: { status: { in: ["awaiting_kane", "compliance"] } },
      }),
      db.alert.findFirst({
        where: { status: { in: ["open", "acknowledged"] } },
        orderBy: { firedAt: "desc" },
        select: { id: true, firedAt: true },
      }),
      db.approvalRequest.findFirst({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      }),
    ]);

  return [
    openAlerts,
    pendingApprovals,
    connectorIssues,
    contentAwaiting,
    latestAlert?.id ?? "",
    latestAlert?.firedAt.toISOString() ?? "",
    latestApproval?.id ?? "",
    latestApproval?.createdAt.toISOString() ?? "",
  ].join("|");
}
