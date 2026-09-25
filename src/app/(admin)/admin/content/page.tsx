import { ContentApprovals } from "@/components/admin/ContentApprovals";
import { ContentUploadForm } from "@/components/admin/ContentUploadForm";
import { WeeklyPlanPanel } from "@/components/admin/WeeklyPlanPanel";
import { AdminShell } from "@/components/admin/AdminShell";
import { getContentPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";
import { serializeFlags } from "@/lib/content/load-flags";
import { computePostCardFlags } from "@/lib/content/post-card-flags";
import { dubaiWeekStartMonday } from "@/lib/content/social-manager";
import { db } from "@/db";

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

  const weekStart = dubaiWeekStartMonday();
  const [wpp, channels] = await Promise.all([
    db.weeklyPostingPlan.findUnique({ where: { weekStart } }),
    db.channel.findMany({ take: 50 }),
  ]);
  const channelKey = (platform: string, account: string) =>
    `${platform}::${account}`;
  const channelMap = new Map(
    channels.map((c) => [channelKey(c.platform, c.account), c]),
  );

  const approvalCards = data.awaiting.map((card) => {
    const ch = channelMap.get(channelKey(card.platform, card.account));
    const flags = computePostCardFlags({
      caption: card.caption,
      compliancePass: card.compliancePass,
      complianceResult: card.complianceResult,
      creatorLicence: card.asset.creatorLicence,
      publicConsent: card.asset.publicConsent,
      platform: card.platform,
      account: card.account,
      scheduledAt: card.scheduledAt,
      assetTags: card.asset.tags,
      wppStatus: wpp?.status ?? null,
      wppNotes: wpp?.notes ?? null,
      channelPaused: ch?.paused ?? false,
      channelWarning: Boolean(ch?.paused),
    });
    return {
      id: card.id,
      title: card.asset.title,
      platform: card.platform,
      account: card.account,
      caption: card.caption,
      scheduledAt: card.scheduledAt?.toISOString() ?? null,
      compliancePass: card.compliancePass,
      complianceResult: card.complianceResult,
      publicConsent: card.asset.publicConsent,
      creatorLicence: card.asset.creatorLicence,
      flags: serializeFlags(flags),
    };
  });

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

      <WeeklyPlanPanel
        plan={
          data.weeklyPlan
            ? {
                id: data.weeklyPlan.id,
                weekStart: data.weeklyPlan.weekStart
                  .toISOString()
                  .slice(0, 10),
                status: data.weeklyPlan.status,
                agreedAt: data.weeklyPlan.agreedAt?.toISOString() ?? null,
                notes: data.weeklyPlan.notes,
              }
            : null
        }
      />

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

      <ContentApprovals cards={approvalCards} />

      <div className="cmd-panel" style={{ marginTop: "1.25rem" }}>
        <div className="cmd-panel-head">
          <div>
            <div
              className="cmd-panel-title"
              data-cms="content.panel.metrics"
            >
              {cms["content.panel.metrics"] ?? "Post metrics (7d)"}
            </div>
            <div
              className="cmd-panel-sub"
              data-cms="content.panel.metricsSub"
            >
              {cms["content.panel.metricsSub"] ??
                "24h / 72h / 7d checkpoints · IG / TT / YT insights when tokens + post URLs available"}
            </div>
          </div>
        </div>
        <div className="cmd-panel-body flush">
          {data.postMetrics.length === 0 ? (
            <div className="cmd-section-note">not measurable yet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Platform</th>
                  <th>Checkpoint</th>
                  <th className="num">Views</th>
                  <th className="num">Likes</th>
                  <th className="num">Comments</th>
                  <th className="num">Shares</th>
                </tr>
              </thead>
              <tbody>
                {data.postMetrics.map((m) => (
                  <tr key={`${m.postCardId}-${m.checkpoint}`}>
                    <td className="cell-strong">{m.title}</td>
                    <td>
                      {m.platform} · {m.account}
                    </td>
                    <td>{m.checkpoint}</td>
                    <td className="num">{m.views}</td>
                    <td className="num">{m.likes}</td>
                    <td className="num">{m.comments}</td>
                    <td className="num">{m.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="cmd-panel" style={{ marginTop: "1.25rem" }}>
        <div className="cmd-panel-head">
          <div
            className="cmd-panel-title"
            data-cms="content.panel.bestByType"
          >
            {cms["content.panel.bestByType"] ?? "Best by type (7d)"}
          </div>
        </div>
        <div className="cmd-panel-body flush">
          {data.bestByType.length === 0 ? (
            <div className="cmd-section-note">not measurable yet</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Post</th>
                  <th>Account</th>
                  <th className="num">Views</th>
                  <th className="num">Likes</th>
                </tr>
              </thead>
              <tbody>
                {data.bestByType.map((row) => (
                  <tr key={row.type}>
                    <td className="cell-strong">
                      {row.type.replaceAll("_", " ")}
                    </td>
                    <td>{row.title}</td>
                    <td>
                      {row.account} · {row.checkpoint}
                    </td>
                    <td className="num">{row.views}</td>
                    <td className="num">{row.likes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
