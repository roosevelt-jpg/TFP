import type { Metadata } from "next";
import { Suspense } from "react";

import { getWaitlistConfirmation } from "@/data/waitlist";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { ConfirmedHero } from "@/features/waitlist/ConfirmedHero";
import { ConfirmedHeroSkeleton } from "@/features/waitlist/ConfirmedHeroSkeleton";
import { ConfirmedInbox } from "@/features/waitlist/ConfirmedInbox";
import { ConfirmedInvalid } from "@/features/waitlist/ConfirmedInvalid";
import { ConfirmedSecondarySteps } from "@/features/waitlist/ConfirmedSecondarySteps";
import { ConfirmedWhatsAppCard } from "@/features/waitlist/ConfirmedWhatsAppCard";
import { LaunchProgress } from "@/features/waitlist/LaunchProgress";

export const metadata: Metadata = {
  title: "You’re on the list",
  robots: { index: false, follow: false },
};

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Home", href: "/" },
];

async function ConfirmedContent({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const confirmationId = Array.isArray(id) ? id[0] : id;
  const confirmation = confirmationId
    ? await getWaitlistConfirmation(confirmationId)
    : null;

  if (!confirmation) {
    return (
      <section
        id="top"
        className="relative px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(56px,10vw,120px)] text-center"
      >
        <GridBackdrop vignette="soft" />
        <ConfirmedInvalid />
      </section>
    );
  }

  return (
    <>
      <section
        id="top"
        className="relative px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(40px,6vw,72px)] text-center"
      >
        <GridBackdrop vignette="soft" />
        <Reveal>
          <ConfirmedHero
            name={confirmation.firstName}
            orderRef={confirmation.ref}
          />
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-(--maxw) px-(--gutter) pb-[clamp(40px,6vw,64px)]">
        <div className="grid gap-4">
          <Reveal>
            <ConfirmedWhatsAppCard />
          </Reveal>
          <Reveal delayMs={80}>
            <ConfirmedSecondarySteps />
          </Reveal>
        </div>

        <LaunchProgress />

        <ConfirmedInbox />

        <Reveal>
          <p className="font-display text-muted mx-auto mt-[clamp(34px,5vw,48px)] text-center text-[1.2rem] italic">
            Talk soon. <span className="text-text">— Kane</span>
          </p>
        </Reveal>
      </section>
    </>
  );
}

export default function JoinedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  return (
    <>
      <SkipLink href="#top" />

      <SiteHeader
        variant="minimal"
        cta={
          <span className="text-good inline-flex items-center gap-[7px] text-[0.8rem]">
            <span aria-hidden className="bg-good size-[7px] rounded-full" />
            You’re on the list
          </span>
        }
      />

      <main className="relative z-10">
        <Suspense
          fallback={
            <section className="relative px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(40px,6vw,72px)]">
              <GridBackdrop vignette="soft" />
              <ConfirmedHeroSkeleton />
            </section>
          }
        >
          <ConfirmedContent searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter links={FOOTER_LINKS} width="default" />
    </>
  );
}
