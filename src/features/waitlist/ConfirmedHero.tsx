import { Eyebrow } from "@/components/brand/Eyebrow";
import { confirmedTrust } from "@/content/waitlist";

export function ConfirmedHero({
  name,
  orderRef,
}: {
  name?: string;
  orderRef?: string;
}) {
  const greeting = name
    ? `Welcome to The Formula, ${name}.`
    : "Welcome to The Formula.";

  return (
    <div className="relative z-1 mx-auto max-w-[680px] text-center">
      <Eyebrow align="center" className="mb-[18px]">
        {orderRef ? `Your reference · #${orderRef}` : "Early access"}
      </Eyebrow>
      <h1 className="text-display text-center">
        You’re <em>on the list.</em>
      </h1>
      <p className="text-muted text-lead mx-auto mt-4 max-w-[42ch] text-center leading-relaxed">
        {greeting} You’ve reserved your early-access spot. Here’s what happens
        next.
      </p>
      <div className="text-muted border-hairline mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 rounded-xs border px-4 py-[11px] text-[0.84rem]">
        <span>
          <b className="text-text font-semibold">{confirmedTrust[0]}</b>
        </span>
        <span
          aria-hidden
          className="bg-hairline-strong size-[3px] rounded-full"
        />
        <span>{confirmedTrust[1]}</span>
        <span
          aria-hidden
          className="bg-hairline-strong size-[3px] rounded-full"
        />
        <span>{confirmedTrust[2]}</span>
      </div>
    </div>
  );
}
