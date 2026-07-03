import type { Metadata } from "next";

import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { SecureBadge } from "@/components/brand/SecureBadge";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { JoinFormSection } from "@/components/sections/JoinFormSection";
import { JoinHeroSection } from "@/components/sections/JoinHeroSection";

export const metadata: Metadata = {
  title: "Join the waitlist",
  description:
    "Register your interest in The Formula Programme. Two minutes to join — we’ll email you the moment a spot opens. No payment today.",
  alternates: { canonical: "/join" },
  openGraph: {
    url: "/join",
    title: "Join the waitlist | The Formula Programme",
    description:
      "Two minutes to register your interest. We’ll email you the moment a spot opens — no payment today.",
  },
};

const FOOTER_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/support" },
];

export default function JoinPage() {
  return (
    <>
      <SkipLink />

      <div className="text-muted border-hairline flex items-center justify-center gap-2 border-b px-(--gutter) py-3 text-center text-[0.78rem]">
        <span
          aria-hidden
          className="bg-red inline-block size-1.5 shrink-0 rounded-full"
        />
        You’re one step from the waitlist
      </div>

      <SiteHeader variant="minimal" cta={<SecureBadge />} />

      <div className="flex justify-center px-(--gutter) min-[900px]:hidden">
        <SecureBadge />
      </div>

      <main id="main" className="relative z-10">
        <section className="relative mx-auto w-full max-w-(--maxw) px-(--gutter) pt-[clamp(18px,3vw,34px)] pb-[clamp(56px,8vw,92px)]">
          <GridBackdrop vignette="soft" />
          <JoinHeroSection />
          <JoinFormSection />
        </section>
      </main>

      <SiteFooter links={FOOTER_LINKS} />
    </>
  );
}
