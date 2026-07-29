import {
  CURRENCY,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
} from "@/lib/pricing";

const LINES = [
  {
    label: `The Formula Programme (${PROGRAMME_WEEKS} weeks)`,
    detail: "Training system, Performance Coach, community, nutrition",
    amount: `${CURRENCY}${PRICE_TODAY}`,
    note: "due today",
  },
  {
    label: "The Formula Membership",
    detail: `Starts week ${PROGRAMME_WEEKS}, cancel anytime`,
    amount: `${CURRENCY}${PRICE_MONTHLY}`,
    note: "a month",
  },
];

export function OrderSummary() {
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

      <ul className="mt-4.5 grid list-none gap-4 p-0">
        {LINES.map((line) => (
          <li
            key={line.label}
            // Stacks below 480px: the label column drops to ~160px there, so a
            // side-by-side row wraps to five lines and the price detaches from
            // what it's pricing.
            className="flex flex-col gap-1.5 min-[480px]:flex-row min-[480px]:items-baseline min-[480px]:justify-between min-[480px]:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[0.92rem]">{line.label}</span>
              <span className="text-muted text-[0.8rem] leading-normal">
                {line.detail}
              </span>
            </span>
            <span className="flex shrink-0 flex-row items-baseline gap-1.5 min-[480px]:flex-col min-[480px]:items-end">
              <span className="text-[0.95rem] font-medium">{line.amount}</span>
              <span className="text-muted text-[0.75rem]">{line.note}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="border-hairline mt-5 flex items-baseline justify-between border-t pt-4">
        <span className="text-[0.92rem]">Due today</span>
        <span className="text-[0.95rem] font-medium">
          {CURRENCY}
          {PRICE_TODAY}
        </span>
      </div>
    </section>
  );
}
