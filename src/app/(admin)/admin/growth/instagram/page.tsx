import { AdminShell } from "@/components/admin/AdminShell";
import { GrowthInbox } from "@/components/admin/GrowthInbox";
import {
  MetaTemplatesForm,
  type MetaTemplateRow,
} from "@/components/admin/WhatsAppTemplatesForm";
import { getGrowthChannelThreads } from "@/lib/admin/growth-channels";
import { requireAdminSession } from "@/lib/auth/session";
import { env } from "@/env";
import { listMetaTemplates } from "@/lib/whatsapp/templates";

function toRows(
  templates: Awaited<ReturnType<typeof listMetaTemplates>>,
): MetaTemplateRow[] {
  return templates.map((t) => ({
    key: t.key,
    channel: t.channel === "instagram" ? "instagram" : "whatsapp",
    label: t.label,
    description: t.description,
    metaName: t.metaName,
    language: t.language,
    bodyText: t.bodyText,
    bodyVars: t.bodyVars,
    buttonUrlCount: t.buttonUrlCount,
    headerMediaType: t.headerMediaType,
    headerMediaUrl: t.headerMediaUrl,
    category: t.category,
    triggerHint: t.triggerHint,
    enabled: t.enabled,
    version: t.version,
  }));
}

export default async function InstagramGrowthPage() {
  const session = await requireAdminSession(["kane", "leah", "lemoni"]);
  const [data, templates] = await Promise.all([
    getGrowthChannelThreads("instagram"),
    listMetaTemplates("instagram"),
  ]);
  const inboundOn =
    env.INSTAGRAM_INBOUND_ENABLED === true ||
    String(env.INSTAGRAM_INBOUND_ENABLED) === "true";

  return (
    <AdminShell titleKey="instagram">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Instagram DMs — admin-managed reply templates (text + optional
          image/video). Same Meta webhook as WhatsApp (
          <code>/api/webhooks/meta</code>).
        </div>
        <ul className="mt-3 space-y-1 text-sm text-[var(--cmd-muted)]">
          <li>
            Inbound: {inboundOn ? "on" : "off"} (
            <code>INSTAGRAM_INBOUND_ENABLED</code>) · page token in Integrations
          </li>
          <li>
            Wired: <code>ig_inbound_ack</code> on every inbound DM (unless
            safety-paused)
          </li>
        </ul>
      </div>

      <MetaTemplatesForm channel="instagram" templates={toRows(templates)} />

      <GrowthInbox
        channelLabel="Instagram"
        aiHandledHint={data.aiHandledHint}
        threads={data.threads}
        canRespond={["kane", "leah"].includes(session.user.role)}
      />
    </AdminShell>
  );
}
