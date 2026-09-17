import { AdminShell } from "@/components/admin/AdminShell";
import { formatGbp, getEmailPageData } from "@/lib/admin/queries/pages";
import { requireAdminSession } from "@/lib/auth/session";
import { getCmsMap } from "@/lib/cms/store";

export default async function EmailPage() {
  await requireAdminSession(["kane", "leah", "lemoni"]);
  const [data, cms] = await Promise.all([
    getEmailPageData(),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="email">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="email.lead">
          {cms["email.lead"] ??
            "Klaviyo campaigns. For WhatsApp / Instagram / Telegram inboxes, use Growth in the sidebar."}
        </div>
      </div>

      <div className="cmd-two-col">
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div className="cmd-panel-title" data-cms="email.panel.campaigns">
              {cms["email.panel.campaigns"] ?? "Campaigns & flows"}
            </div>
          </div>
          <div className="cmd-panel-body flush">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="num">Recipients</th>
                  <th className="num">Revenue</th>
                  <th className="num">Rev/send</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.emails.map((row) => (
                  <tr key={row.id}>
                    <td className="cell-strong">{row.name}</td>
                    <td className="num">{row.recipients}</td>
                    <td className="num">{formatGbp(row.revenuePence)}</td>
                    <td className="num">
                      {row.recipients
                        ? formatGbp(Math.round(row.revenuePence / row.recipients))
                        : "—"}
                    </td>
                    <td>
                      <span className="cmd-badge cmd-badge-live">
                        {row.status ?? row.kind}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="cmd-panel">
          <div className="cmd-panel-head">
            <div>
              <div className="cmd-panel-title" data-cms="email.panel.threads">
                {cms["email.panel.threads"] ?? "Lead threads waiting"}
              </div>
              <div className="cmd-panel-sub" data-cms="email.panel.threadsSub">
                {cms["email.panel.threadsSub"] ??
                  "High-intent unanswered first"}
              </div>
            </div>
          </div>
          <div className="cmd-panel-body">
            {data.threads.map((thread) => (
              <div
                key={thread.id}
                className={`cmd-alert-card ${thread.highIntent ? "p1" : "p3"}`}
              >
                <div>
                  <div className="cmd-alert-id">
                    {thread.channel.toUpperCase()} · {thread.externalId}
                  </div>
                  <div className="cmd-alert-what">
                    {thread.snippet ?? "Inbound message"}
                  </div>
                  <div className="cmd-alert-meta">
                    <span>{thread.contactName ?? "Unknown"}</span>
                    <span>
                      {thread.lastInboundAt?.toLocaleString("en-GB") ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
