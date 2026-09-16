import { AdminShell } from "@/components/admin/AdminShell";
import { getIntegrationsPageData } from "@/lib/admin/queries/pages";
import { env } from "@/env";

const CREDENTIAL_ROWS = [
  {
    sourceId: "S1",
    name: "Shopify",
    keys: ["SHOPIFY_SHOP_DOMAIN", "SHOPIFY_ADMIN_TOKEN"],
    configured: () => Boolean(env.SHOPIFY_SHOP_DOMAIN && env.SHOPIFY_ADMIN_TOKEN),
  },
  {
    sourceId: "S2",
    name: "Stripe",
    keys: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    configured: () => Boolean(env.STRIPE_SECRET_KEY),
  },
  {
    sourceId: "S3",
    name: "Meta Ads",
    keys: ["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID"],
    configured: () => Boolean(env.META_ACCESS_TOKEN && env.META_AD_ACCOUNT_ID),
  },
  {
    sourceId: "S4",
    name: "Klaviyo",
    keys: ["KLAVIYO_API_KEY"],
    configured: () => Boolean(env.KLAVIYO_API_KEY),
  },
  {
    sourceId: "S5",
    name: "GoHighLevel",
    keys: ["GHL_INTEGRATION_TOKEN", "GHL_LOCATION_ID"],
    configured: () =>
      Boolean(env.GHL_INTEGRATION_TOKEN && env.GHL_LOCATION_ID),
  },
  {
    sourceId: "S6",
    name: "n8n",
    keys: ["N8N_API_URL", "N8N_API_KEY"],
    configured: () => Boolean(env.N8N_API_URL && env.N8N_API_KEY),
  },
  {
    sourceId: "S7",
    name: "Gmail",
    keys: ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"],
    configured: () =>
      Boolean(
        env.GMAIL_CLIENT_ID &&
          env.GMAIL_CLIENT_SECRET &&
          env.GMAIL_REFRESH_TOKEN,
      ),
  },
  {
    sourceId: "S8",
    name: "Calendly",
    keys: ["CALENDLY_TOKEN"],
    configured: () => Boolean(env.CALENDLY_TOKEN),
  },
  {
    sourceId: "S12",
    name: "Revolut",
    keys: ["REVOLUT_API_TOKEN"],
    configured: () => Boolean(env.REVOLUT_API_TOKEN),
  },
  {
    sourceId: "S13",
    name: "Frame.io",
    keys: ["FRAME_IO_TOKEN"],
    configured: () => Boolean(env.FRAME_IO_TOKEN),
  },
  {
    sourceId: "Telegram",
    name: "Telegram approvals",
    keys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_KANE_CHAT_ID"],
    configured: () =>
      Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_KANE_CHAT_ID),
  },
  {
    sourceId: "CTO",
    name: "Claude CTO agent",
    keys: ["ANTHROPIC_API_KEY"],
    configured: () => Boolean(env.ANTHROPIC_API_KEY),
  },
] as const;

export default async function IntegrationsPage() {
  const connectors = await getIntegrationsPageData();

  return (
    <AdminShell titleKey="integrations">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          <strong>{connectors.length}</strong> data sources in the warehouse
          registry.
        </div>
      </div>

      <div className="cmd-section-note">
        API credentials are not entered in the UI — set them in{" "}
        <span className="cmd-mono">.env.local</span> (local) or Vercel env
        (production). Restart the dev server after changes. See{" "}
        <span className="cmd-mono">.env.example</span> for every key.
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div>
            <div className="cmd-panel-title">Credential checklist</div>
            <div className="cmd-panel-sub">
              Status reflects whether the env var is present — not a live API
              ping
            </div>
          </div>
        </div>
        <div className="cmd-panel-body">
          {CREDENTIAL_ROWS.map((row) => {
            const ok = row.configured();
            return (
              <div className="cmd-role-row" key={row.sourceId}>
                <div className="cell-strong">
                  {row.name}
                  <div className="cell-muted" style={{ marginTop: 2 }}>
                    {row.sourceId}
                  </div>
                </div>
                <div className="cell-muted cmd-mono" style={{ fontSize: 11 }}>
                  {row.keys.join(" · ")}
                </div>
                <div>
                  <span
                    className={`cmd-badge ${ok ? "cmd-badge-verified" : "cmd-badge-calculated"}`}
                  >
                    {ok ? "Set" : "Missing"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cmd-panel">
        <div className="cmd-panel-head">
          <div className="cmd-panel-title">Data sources</div>
        </div>
        <div className="cmd-panel-body">
          <div className="cmd-int-grid">
            {connectors.map((c) => (
              <div className="cmd-integration-card" key={c.id}>
                <div className="cmd-int-top">
                  <div>
                    <div className="cmd-int-name">{c.name}</div>
                    <div className="cmd-int-id">{c.sourceId}</div>
                  </div>
                  <span
                    className={`cmd-badge ${c.writeGated ? "cmd-badge-calculated" : "cmd-badge-verified"}`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="cmd-int-desc">
                  {c.scheduleNote ?? "Warehouse mirror"}
                </div>
                <div className="cmd-int-meta">
                  <span>
                    {c.lastSuccessAt
                      ? `Last ok ${c.lastSuccessAt.toLocaleString("en-GB")}`
                      : "Not run yet"}
                  </span>
                  <span>{c.writeGated ? "Write gated" : "Read-only"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
