import { LandingCmsForm } from "@/components/admin/LandingCmsForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCmsMap, LANDING_CMS_NAMESPACE } from "@/lib/cms/store";
import { launchCopy } from "@/content/launch-copy";
import { requireAdminSession } from "@/lib/auth/session";

const FIELDS = [
  { key: "announcement", label: "Announcement bar", fallback: launchCopy.announcement },
  { key: "hero.headline", label: "Hero headline", fallback: "Lose fat. Build muscle. Become stronger, fitter and more functional in 8 weeks." },
  { key: "hero.subhead", label: "Hero supporting line", fallback: "An 8-week training system with your own Performance Coach inside WhatsApp to keep you accountable every step of the way." },
  { key: "cta", label: "Primary CTA", fallback: launchCopy.cta },
  { key: "stickyLabel", label: "Sticky bar label", fallback: launchCopy.stickyLabel },
  { key: "stickySecondary", label: "Sticky bar secondary", fallback: launchCopy.stickySecondary },
  { key: "finalCta", label: "Final CTA body", fallback: launchCopy.finalCta },
] as const;

export default async function LandingCmsPage() {
  await requireAdminSession(["kane", "lemoni"]);
  const [landingCms, cms] = await Promise.all([
    getCmsMap(LANDING_CMS_NAMESPACE),
    getCmsMap("admin"),
  ]);

  return (
    <AdminShell titleKey="cms">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line" data-cms="cms.lead">
          {cms["cms.lead"] ??
            "Edit marketing landing copy. Changes publish immediately on /."}
        </div>
      </div>
      <LandingCmsForm
        fields={FIELDS.map((field) => ({
          key: field.key,
          label: field.label,
          value: landingCms[field.key] ?? field.fallback,
        }))}
      />
    </AdminShell>
  );
}
