import { AdminShell } from "@/components/admin/AdminShell";
import { CtoWorkflow, type CtoActivity } from "@/components/admin/CtoWorkflow";
import { db } from "@/db";
import { requireAdminSession } from "@/lib/auth/session";

function stamp(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}

function metaText(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const record = meta as Record<string, unknown>;
  if (typeof record.text === "string" && record.text.trim()) {
    return record.text.trim().slice(0, 180);
  }
  if (typeof record.note === "string") return record.note.slice(0, 180);
  if (typeof record.prompt === "string") return record.prompt.slice(0, 180);
  return "";
}

export default async function WorkflowPage() {
  await requireAdminSession(["kane"]);

  const [runs, pending] = await Promise.all([
    db.auditLog.findMany({
      where: { actor: "cto-agent" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.approvalRequest.findMany({
      where: { createdBy: "cto-agent", status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const activity: CtoActivity[] = runs.map((run) => ({
    id: run.id,
    at: stamp(run.createdAt),
    title: run.action.replace(/^cto\./, "").replaceAll("_", " "),
    detail: metaText(run.meta) || "Logged by the CTO agent.",
  }));

  const waiting: CtoActivity[] = pending.map((item) => ({
    id: item.id,
    at: stamp(item.createdAt),
    title: item.action,
    detail: item.specialistVerdict ?? item.reach ?? "Waiting on your tap.",
  }));

  return (
    <AdminShell titleKey="workflow">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          The CTO reads each department, drafts, and stops. A specialist blocks
          anything that moves money or edits automations. You approve the rest.
        </div>
      </div>
      <CtoWorkflow activity={activity} pending={waiting} />
    </AdminShell>
  );
}
