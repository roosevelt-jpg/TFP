import { launchCopy } from "@/content/launch-copy";

import { CtaButton } from "./CtaButton";

type PricingCardProps = {
  priceToday: number | string;
  priceMonthly: number;
  currency?: string;
  features: string[];
  cta: { label: string; href: string };
  reassurance?: React.ReactNode;
};

export function PricingCard({
  priceToday,
  priceMonthly,
  currency = "£",
  features,
  cta,
  reassurance,
}: PricingCardProps) {
  return (
    <div
      data-landing-card
      className="bg-bg border-hairline-strong mx-auto max-w-[500px] rounded-xs border p-[clamp(18px,3vw,28px)] text-left"
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <div className="font-display text-[clamp(2.4rem,6.5vw,3.25rem)] leading-[0.9] font-medium tracking-[-0.02em]" data-landing-price>
          {currency}
          {priceToday}
        </div>
        <span className="text-dim text-[0.82rem] font-semibold tracking-[0.06em] uppercase">
          to start
        </span>
      </div>

      <p className="mt-2.5 text-[0.88rem] leading-[1.4]">
        Includes your full <b className="font-semibold">8-week programme</b>{" "}
        <span className="text-dim">+</span> your{" "}
        <b className="font-semibold">Performance Coach for 8 weeks</b>.
      </p>

      <div className="bg-hairline my-4 h-px" data-landing-divider />

      <p className="text-muted text-[0.85rem] leading-[1.4]">
        Then{" "}
        <b className="text-text font-semibold">
          {currency}
          {priceMonthly}/month
        </b>{" "}
        to keep your Performance Coach after week 8.{" "}
        <b className="text-text font-semibold">Cancel anytime.</b>
      </p>

      <ul className="mt-3 grid list-none gap-1.5 p-0">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-[0.82rem]"
          >
            <span aria-hidden className="bg-red mt-1.5 size-[4px] shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <CtaButton href={cta.href} block className="mt-4" size="sm">
        {cta.label}
      </CtaButton>

      {reassurance && (
        <p className="text-dim mt-2.5 text-center text-[0.75rem] leading-normal">
          {reassurance}
        </p>
      )}

      <div className="text-dim mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.7rem] min-[480px]:gap-3">
        <span className="inline-flex items-center gap-2">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-[13px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <title>Lock</title>
            <rect x="4" y="11" width="16" height="9" rx="1" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {launchCopy.pricingLock}
        </span>
        <span className="inline-flex items-center gap-2">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-[13px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <title>Guarantee</title>
            <path d="M9 12l2 2 4-4" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          14-day money-back guarantee
        </span>
      </div>
    </div>
  );
}
