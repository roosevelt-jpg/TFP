import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import type { SearchParams } from "nuqs/server";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";
import { SecureBadge } from "@/components/brand/SecureBadge";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { resolveOffer } from "@/lib/offers/resolve";
import { loadCheckoutSearchParams } from "@/lib/payments/search-params";
import { LAUNCH_PROMOTION_CODE } from "@/lib/pricing";
import { promoCodeField } from "@/lib/validation/checkout/schema";
import { IntakeForm } from "@/features/checkout/IntakeForm";
import { IntakeFormSkeleton } from "@/features/checkout/IntakeFormSkeleton";
import { OrderSummary } from "@/features/checkout/OrderSummary";

export const metadata: Metadata = {
  title: "Join the programme",
  robots: { index: false },
};

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Support", href: "/support" },
];

async function Intake({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { t, promo } = await loadCheckoutSearchParams(searchParams);
  const promoCode = promoCodeField.safeParse(promo ?? undefined);

  return (
    <IntakeForm
      waitlistToken={t ?? undefined}
      initialPromoCode={promoCode.success ? promoCode.data : undefined}
    />
  );
}

async function Summary({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { promo } = await loadCheckoutSearchParams(searchParams);
  const promoCode = promoCodeField.safeParse(promo ?? undefined);
  // Prefer the URL promo (usually FORMULA50 from live CTAs); otherwise resolve
  // with no code so the summary never invents a discount.
  const offer = await resolveOffer(
    promoCode.success ? promoCode.data : LAUNCH_PROMOTION_CODE,
  );

  return <OrderSummary offer={offer} />;
}

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <SkipLink />

      <div className="text-muted border-hairline flex items-center justify-center gap-2 border-b px-(--gutter) py-3 text-center text-[0.78rem]">
        <span
          aria-hidden
          className="bg-red inline-block size-1.5 shrink-0 rounded-full"
        />
        You’re one step from starting
      </div>

      <SiteHeader
        variant="minimal"
        cta={<SecureBadge />}
        logoPriority
        ctaOnMobile={false}
      />

      <main id="main" className="relative z-10">
        <section className="relative mx-auto w-full max-w-(--maxw) px-(--gutter) pt-[clamp(18px,3vw,34px)] pb-[clamp(56px,8vw,92px)]">
          <GridBackdrop vignette="soft" />

          <div className="relative z-1">
            <Reveal>
              <Eyebrow>Checkout</Eyebrow>
            </Reveal>
            <Reveal delayMs={60}>
              <h1 className="mt-3.5 max-w-[18ch] text-[clamp(2.1rem,5.6vw,3.4rem)] text-balance">
                Start your transformation.
              </h1>
            </Reveal>
            <Reveal delayMs={120}>
              <p className="text-muted text-lead mt-4 max-w-[48ch] leading-relaxed">
                A few details so your coach knows who they’re working with. Your
                programme and your coach are ready the moment you’re through.
              </p>
            </Reveal>
          </div>

          <div className="relative z-1 mt-[clamp(34px,5vw,52px)] grid gap-[clamp(26px,4vw,52px)] min-[900px]:grid-cols-[1.08fr_0.92fr] min-[900px]:items-start">
            <Reveal delayMs={160}>
              <Suspense fallback={<IntakeFormSkeleton />}>
                <Intake searchParams={searchParams} />
              </Suspense>
            </Reveal>

            <aside className="grid content-start gap-4 min-[900px]:sticky min-[900px]:top-6">
              <Suspense
                fallback={
                  <div className="border-hairline rounded-xs border p-6 text-muted text-sm">
                    Loading order…
                  </div>
                }
              >
                <Summary searchParams={searchParams} />
              </Suspense>
              <p className="text-muted text-[0.85rem] leading-[1.6]">
                Questions before you start?{" "}
                <Link href="/support" className="text-text underline">
                  Talk to the team
                </Link>
                .
              </p>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter links={FOOTER_LINKS} width="default" />
    </>
  );
}
