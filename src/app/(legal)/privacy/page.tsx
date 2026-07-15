import type { Metadata } from "next";

import { CookieChoices } from "@/components/CookieChoices";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { privacy } from "@/content/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How The Formula Programme collects and uses your data (name, email, WhatsApp number and coaching messages) under UK and EU GDPR.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    url: "/privacy",
    title: "Privacy Policy | The Formula Programme",
    description:
      "What we collect, how we use it, and your data-protection rights.",
  },
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      doc={privacy}
      footer={{ heading: "Your cookie choice", body: <CookieChoices /> }}
    />
  );
}
