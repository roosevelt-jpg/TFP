import type { Metadata } from "next";
import { Suspense } from "react";

import type { SearchParams } from "nuqs/server";

import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { confirmCheckout } from "@/lib/payments/confirm-checkout";
import { loadSuccessSearchParams } from "@/lib/payments/search-params";
import { CheckoutNotice } from "@/features/checkout/CheckoutNotice";
import { CoachingCard } from "@/features/checkout/CoachingCard";
import { ConfirmingSkeleton } from "@/features/checkout/ConfirmingSkeleton";
import { PaidHero } from "@/features/checkout/PaidHero";
import { PaidReceipt } from "@/features/checkout/PaidReceipt";
import { PaidSecondarySteps } from "@/features/checkout/PaidSecondarySteps";
import { TrackPurchase } from "@/features/checkout/TrackPurchase";
import { WhatsAppOptIn } from "@/features/checkout/WhatsAppOptIn";

export const metadata: Metadata = {
  title: "You're in",
  robots: { index: false },
};

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

async function Confirmation({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { session_id } = await loadSuccessSearchParams(searchParams);

  // Fulfils as well as verifies (Stripe's recommended second ingress), so the
  // reference below is a real Purchase row even if the webhook is delayed.
  const confirmed = session_id
    ? await confirmCheckout(session_id)
    : ({ state: "invalid" } as const);

  if (confirmed.state === "processing") {
    return (
      <CheckoutNotice
        eyebrow="Payment processing"
        heading={
          <>
            Nearly <em>there.</em>
          </>
        }
        body="Your bank is still confirming the payment, which can take a few days with some methods. We’ll email you the moment it clears, and your programme starts then."
      />
    );
  }

  if (confirmed.state === "invalid") {
    return (
      <CheckoutNotice
        eyebrow="Nothing to show"
        heading={
          <>
            We can’t find that <em>checkout.</em>
          </>
        }
        body="This link is missing its checkout reference, or it’s expired. If you’ve just paid, check your inbox for the receipt, or talk to the team and we’ll sort it."
        cta={{ href: "/support", label: "Talk to the Team" }}
      />
    );
  }

  return (
    <>
      {/* Fires once per purchase, keyed in sessionStorage so a reload or a
          router.refresh from the coaching form does not count twice. */}
      <TrackPurchase
        orderRef={confirmed.ref}
        value={confirmed.amountTotal / 100}
        currency={confirmed.currency.toUpperCase()}
      />

      <section
        id="top"
        className="relative px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(40px,6vw,72px)] text-center"
      >
        <GridBackdrop vignette="soft" />
        <Reveal>
          <PaidHero name={confirmed.firstName} orderRef={confirmed.ref} />
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-(--maxw) px-(--gutter) pb-[clamp(40px,6vw,64px)]">
        <div className="grid gap-4">
          <Reveal>
            <CoachingCard
              sessionId={confirmed.sessionId}
              customerId={confirmed.customerId}
            />
          </Reveal>
          <Reveal delayMs={60}>
            <WhatsAppOptIn />
          </Reveal>
          <Reveal delayMs={120}>
            <PaidSecondarySteps />
          </Reveal>
          <Reveal delayMs={160}>
            <PaidReceipt
              orderRef={confirmed.ref}
              sessionId={confirmed.sessionId}
            />
          </Reveal>
        </div>

        <Reveal>
          <p className="font-display text-muted mx-auto mt-[clamp(34px,5vw,48px)] text-center text-[1.2rem] italic">
            Let’s get to work. <span className="text-text">Kane</span>
          </p>
        </Reveal>
      </section>
    </>
  );
}

export default function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="minimal" logoPriority />

      <main id="main" className="relative z-10">
        <Suspense
          fallback={
            <section className="relative px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(40px,6vw,72px)]">
              <GridBackdrop vignette="soft" />
              <ConfirmingSkeleton />
            </section>
          }
        >
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </main>

      <SiteFooter links={FOOTER_LINKS} width="default" />
    </>
  );
}
