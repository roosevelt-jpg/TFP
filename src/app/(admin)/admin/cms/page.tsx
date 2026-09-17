import { LandingCmsForm } from "@/components/admin/LandingCmsForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { groupLandingFields, LANDING_CMS_FIELDS } from "@/lib/cms/landing-catalog";
import { getCmsMap, LANDING_CMS_NAMESPACE } from "@/lib/cms/store";
import { requireAdminSession } from "@/lib/auth/session";

export default async function LandingCmsPage() {
  await requireAdminSession(["kane", "lemoni"]);
  const stored = await getCmsMap(LANDING_CMS_NAMESPACE);

  const groups = groupLandingFields().map(([group, fields]) => {
    const values = fields.map((field) => ({
      key: field.key,
      label: field.label,
      kind: field.kind,
      help: field.help,
      value: stored[field.key] ?? field.fallback,
    }));
    return [group, values] as [string, typeof values];
  });

  return (
    <AdminShell titleKey="cms">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Full landing + brand CMS ({LANDING_CMS_FIELDS.length} fields). Images,
          copy, FAQ, testimonials, video, pricing labels, logos and email brand —
          all editable. API keys → Integrations.
        </div>
      </div>
      <LandingCmsForm groups={groups} />
    </AdminShell>
  );
}
