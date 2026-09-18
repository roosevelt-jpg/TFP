import { Suspense } from "react";

import { LandingCmsForm } from "@/components/admin/LandingCmsForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { groupLandingFields, LANDING_CMS_FIELDS } from "@/lib/cms/landing-catalog";
import {
  plainTextJsonStrings,
  stripHtmlToPlainText,
} from "@/lib/cms/plain-text";
import { getCmsMap, LANDING_CMS_NAMESPACE } from "@/lib/cms/store";
import { requireAdminSession } from "@/lib/auth/session";

export default function LandingCmsPage() {
  return (
    <Suspense
      fallback={
        <div className="tfp-command" data-theme="dark">
          <div className="cmd-app">
            <div className="cmd-main" style={{ padding: 24 }}>
              Loading CMS…
            </div>
          </div>
        </div>
      }
    >
      <LandingCmsPageContent />
    </Suspense>
  );
}

async function LandingCmsPageContent() {
  await requireAdminSession(["kane", "lemoni"]);
  const stored = await getCmsMap(LANDING_CMS_NAMESPACE);

  const groups = groupLandingFields().map(([group, fields]) => {
    const values = fields.map((field) => {
      const raw = stored[field.key] ?? field.fallback;
      const value =
        field.kind === "image" || field.kind === "toggle"
          ? raw
          : field.kind === "json"
            ? plainTextJsonStrings(raw)
            : stripHtmlToPlainText(raw);
      return {
        key: field.key,
        label: field.label,
        kind: field.kind,
        help: field.help,
        value,
      };
    });
    return [group, values] as [string, typeof values];
  });

  return (
    <AdminShell titleKey="cms">
      <div className="cmd-page-lead">
        <div className="cmd-page-lead-line">
          Plain-text landing CMS ({LANDING_CMS_FIELDS.length} fields). No HTML —
          copy only. Images and toggles stay as-is. API keys → Integrations.
        </div>
      </div>
      <LandingCmsForm groups={groups} />
    </AdminShell>
  );
}
