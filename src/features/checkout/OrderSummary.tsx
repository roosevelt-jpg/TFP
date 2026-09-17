import type { ResolvedOffer } from "@/lib/offers/resolve";
import { formatGbpAmount } from "@/lib/pricing";

type Props = {
  offer: ResolvedOffer;
};

export function OrderSummary({ offer }: Props) {
  const lines = [
    {
      label: `The Formula Programme (${offer.programmeWeeks} weeks)`,
      detail: "Training system, Performance Coach, community, nutrition",
      amount: offer.amountDueTodayLabel,
      note: "due today",
      strike:
        offer.founderActive ? offer.standardAmountLabel : null,
    },
    {
      label: "The Formula Membership",
      detail: `Starts week ${offer.programmeWeeks}, cancel anytime`,
      amount: offer.renewalAmountLabel,
      note: "a month",
      strike: null as string | null,
    },
  ];

  return (
    <section
      aria-labelledby="order-summary-heading"
      className="border-hairline rounded-xs border p-[clamp(22px,3.5vw,30px)]"
    >
      <h2
        id="order-summary-heading"
        className="font-body tracking-label text-muted text-[0.72rem] font-semibold uppercase"
      >
        Your order
      </h2>

      {offer.promoState === "invalid" ? (
        <p className="text-muted mt-3 text-[0.8rem] leading-normal">
          That promo code isn’t available — showing standard pricing.
        </p>
      ) : null}

      {offer.founderActive ? (
        <p className="mt-3 text-[0.8rem] leading-normal text-[var(--red)]">
          Founder promo applied ({offer.promotionCode}).
        </p>
      ) : null}

      <ul className="mt-4.5 grid list-none gap-4 p-0">
        {lines.map((line) => (
          <li
            key={line.label}
            className="flex flex-col gap-1.5 min-[480px]:flex-row min-[480px]:items-baseline min-[480px]:justify-between min-[480px]:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[0.92rem]">{line.label}</span>
              <span className="text-muted text-[0.8rem] leading-normal">
                {line.detail}
              </span>
            </span>
            <span className="flex shrink-0 flex-row items-baseline gap-1.5 min-[480px]:flex-col min-[480px]:items-end">
              <span className="text-[0.95rem] font-medium">
                {line.strike ? (
                  <>
                    <span className="text-muted mr-1.5 line-through">
                      {line.strike}
                    </span>
                    {line.amount}
                  </>
                ) : (
                  line.amount
                )}
              </span>
              <span className="text-muted text-[0.75rem]">{line.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="border-hairline mt-5 flex items-baseline justify-between border-t pt-4">
        <span className="text-[0.92rem]">Due today</span>
        <span className="text-[0.95rem] font-medium">
          {offer.currencySymbol}
          {formatGbpAmount(offer.amountDueToday)}
        </span>
      </div>

      <p className="text-muted mt-3 text-[0.78rem] leading-[1.55]">
        {offer.renewalDisclosure}
      </p>
    </section>
  );
}
