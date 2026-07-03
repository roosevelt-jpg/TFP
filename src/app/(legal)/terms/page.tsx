import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { terms } from "@/content/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for The Formula Programme — the 8-week programme and your AI Performance Coach in WhatsApp, operated by The Formula Performance Elite Ltd.",
  alternates: { canonical: "/terms" },
  openGraph: {
    url: "/terms",
    title: "Terms of Service | The Formula Programme",
    description: "The terms for the 8-week programme and Performance Coach.",
  },
};

export default function TermsPage() {
  return <LegalLayout doc={terms} />;
}
