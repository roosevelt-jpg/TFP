import type { Metadata } from "next";
import { Suspense } from "react";

import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { SupportHeroSection } from "@/components/sections/SupportHeroSection";
import { PAYMENTS_LIVE } from "@/lib/launch";
import {
  isSupportType,
  visibleSupportOptions,
} from "@/lib/validation/support/options";
import { SupportForm } from "@/features/support/SupportForm";
import { SupportFormSkeleton } from "@/features/support/SupportFormSkeleton";

const SUPPORT_DESCRIPTION = PAYMENTS_LIVE
  ? "Get help with The Formula Programme: questions, billing, changing your WhatsApp number, pausing or cancelling. The team replies within one working day."
  : "Get help with The Formula Programme: questions about the programme, changing your WhatsApp number, or anything else. The team replies within one working day.";

export const metadata: Metadata = {
  title: "Support",
  description: SUPPORT_DESCRIPTION,
  alternates: { canonical: "/support" },
  robots: { index: false },
  openGraph: {
    url: "/support",
    title: "Support | The Formula Programme",
    description: SUPPORT_DESCRIPTION,
  },
};

const FOOTER_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Home", href: "/" },
];

async function SupportFormPanel({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const options = visibleSupportOptions(PAYMENTS_LIVE);
  const { type } = await searchParams;
  // Only honour a ?type deep link if it's a currently-offered option.
  const requested = isSupportType(type) ? type : undefined;
  const defaultType =
    requested && options.some((o) => o.value === requested)
      ? requested
      : "general";

  return (
    <SupportForm
      key={defaultType}
      defaultType={defaultType}
      options={options}
      paymentsLive={PAYMENTS_LIVE}
    />
  );
}

export default function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="minimal" logoPriority />

      <main id="main" className="relative z-10">
        <SupportHeroSection paymentsLive={PAYMENTS_LIVE} />
        <section className="pb-[clamp(28px,5vw,52px)]">
          <Container className="relative z-1">
            <Suspense fallback={<SupportFormSkeleton />}>
              <SupportFormPanel searchParams={searchParams} />
            </Suspense>
          </Container>
        </section>
      </main>

      <SiteFooter links={FOOTER_LINKS} />
    </>
  );
}
