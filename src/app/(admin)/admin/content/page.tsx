import { ContentApprovals } from "@/components/admin/ContentApprovals";
import { ContentUploadForm } from "@/components/admin/ContentUploadForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { getContentPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

const STATES = [
  "draft",
  "tagged",
  "in_plan",
  "brief_locked",
  "in_edit",
  "in_qc",
  "changes_requested",
  "compliance",
  "ready",
  "awaiting_kane",
  "scheduled",
  "published",
  "failed",
] as const;

export default async function ContentPage() {
  await requireAdminSession(["kane", "lemoni"]);
  const [data, cms] = await Promise.all([
    getContentPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="content">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="content.lead">
          {cms["content.lead"] ??
            `${data.awaiting.length} awaiting Kane · pipeline by state below.`}
        </div>
      </div>

      <div className="cmd-section-note" data-cms="content.note">
        {cms["content.note"] ??
          "Every finished post comes to Kane. Approval schedules it — nothing posts on its own. Editor rules: docs/editor-knowledge-base.md"}
      </div>

      <ContentUploadForm />

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title" data-cms="content.panel.pipeline">
            {cms["content.panel.pipeline"] ?? "Pipeline by state"}
          </div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-pipe-cols">
            {STATES.map((state) => (
              <div className="cmd-pipe-col" key={state}>
                <h4>{state.replaceAll("_", " ")}</h4>
                {data.assets
                  .filter((a) => {
                    if (a.state === state) return true;
                    if (state === "draft" && a.state === "uploaded") return true;
                    if (state === "in_edit" && a.state === "editing") return true;
                    if (state === "in_qc" && a.state === "review") return true;
                    if (state === "published" && a.state === "posted") return true;
                    if (state === "failed" && a.state === "rejected") return true;
                    return false;
                  })
                  .slice(0, 4)
                  .map((asset) => (
                    <div className="cmd-pipe-card" key={asset.id}>
                      <div className="pc-title">{asset.title}</div>
                      <div className="pc-meta">
                        <span>{asset.uploader}</span>
                        <span>
                          {asset.updatedAt.toLocaleDateString("en-GB")}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ContentApprovals
        cards={data.awaiting.map((card) => ({
          id: card.id,
          title: card.asset.title,
          platform: card.platform,
          account: card.account,
          scheduledAt: card.scheduledAt?.toISOString() ?? null,
          compliancePass: card.compliancePass,
          complianceResult: card.complianceResult,
        }))}
      />
    </AdminShell>
  );
}
