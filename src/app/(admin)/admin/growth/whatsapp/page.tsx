import { AdminShell } from "@/components/admin/AdminShell";
import { GrowthInbox } from "@/components/admin/GrowthInbox";
import {
  MetaTemplatesForm,
  type MetaTemplateRow,
} from "@/components/admin/WhatsAppTemplatesForm";
import { getGrowthChannelThreads } from "@/lib/admin/growth-channels";
import { requireAdminSession } from "@/lib/auth/session";
import {
  isWhatsAppConfigured,
  whatsappPurchaseActivationEnabled,
  whatsappWorkflowsEnabled,
} from "@/lib/whatsapp/config";
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

export default async function WhatsAppGrowthPage() {
  const session = await requireAdminSession(["kane", "leah", "lemoni"]);
  const [data, configured, templates] = await Promise.all([
    getGrowthChannelThreads("whatsapp"),
    isWhatsAppConfigured(),
    listMetaTemplates("whatsapp"),
  ]);
  const workflowsOn = whatsappWorkflowsEnabled();
  const purchaseWaOn = whatsappPurchaseActivationEnabled();

  return (
    <AdminShell titleKey="whatsapp">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          WhatsApp Cloud API — automation sends to the CRM{" "}
          <code>Customer.whatsapp</code> / waitlist number (E.164). Same Meta
          webhook as Instagram (<code>/api/webhooks/meta</code>).
        </div>
        <ul className="mt-3 space-y-1 text-sm text-[var(--cmd-muted)]">
          <li>
            Workflows: {workflowsOn ? "on" : "off"} · credentials:{" "}
            {configured ? "set" : "missing"} · purchase WA:{" "}
            {purchaseWaOn ? "on" : "off"}
          </li>
          <li>
            Media: set header image/video HTTPS URL on a template (must match
            the approved Meta media header). Session image/video also supported
            inside the 24h window.
          </li>
        </ul>
      </div>

      <MetaTemplatesForm channel="whatsapp" templates={toRows(templates)} />

      <GrowthInbox
        channelLabel="WhatsApp"
        aiHandledHint={data.aiHandledHint}
        threads={data.threads}
        canRespond={["kane", "leah"].includes(session.user.role)}
      />
    </AdminShell>
  );
}
