import { Eyebrow } from "@/components/brand/Eyebrow";
import { paidTrust } from "@/content/checkout";

export function PaidHero({
  name,
  orderRef,
}: {
  name?: string;
  orderRef: string;
}) {
  const greeting = name ? `You’re in, ${name}.` : "You’re in.";

  return (
    <div className="relative z-1 mx-auto max-w-170 text-center">
      <Eyebrow align="center" className="mb-4.5">
        Your reference · #{orderRef}
      </Eyebrow>
      <h1 className="text-display text-center">Welcome to The Formula.</h1>
      <p className="text-muted text-lead mx-auto mt-4 max-w-[42ch] text-center leading-relaxed">
        {greeting} Your payment went through and your place is confirmed. Two
        quick things and your coach can get started.
      </p>
      <div className="text-muted border-hairline mx-auto mt-5 inline-flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2 rounded-xs border px-4 py-2.75 text-[0.84rem]">
        <span>
          <b className="text-text font-semibold">{paidTrust[0]}</b>
        </span>
        <span
          aria-hidden
          className="bg-hairline-strong size-0.75 rounded-full"
        />
        <span>{paidTrust[1]}</span>
        <span
          aria-hidden
          className="bg-hairline-strong size-0.75 rounded-full"
        />
        <span>{paidTrust[2]}</span>
      </div>
    </div>
  );
}
