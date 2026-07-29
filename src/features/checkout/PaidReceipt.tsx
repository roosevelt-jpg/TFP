import Link from "next/link";

import {
  CURRENCY,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
} from "@/lib/pricing";

import { ManageBillingButton } from "./ManageBillingButton";

// After a £149 charge, not restating what was bought is the biggest trust gap
// on the page, and an unrestated rollover is the most common cause of refunds.
export function PaidReceipt({
  orderRef,
  sessionId,
}: {
  orderRef: string;
  sessionId: string;
}) {
  return (
    <div className="border-hairline rounded-md border bg-bg p-[clamp(22px,4vw,30px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-h3 font-semibold">What you paid for</h3>
        <span className="text-muted text-[0.85rem]">#{orderRef}</span>
      </div>

      <dl className="mt-4 grid gap-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted">
            The Formula Programme ({PROGRAMME_WEEKS} weeks)
          </dt>
          <dd className="font-semibold">
            {CURRENCY}
            {PRICE_TODAY}
          </dd>
        </div>
        <div className="border-hairline flex items-baseline justify-between gap-4 border-t pt-2.5">
          <dt className="text-muted">
            Membership, from week {PROGRAMME_WEEKS}
          </dt>
          <dd className="font-semibold">
            {CURRENCY}
            {PRICE_MONTHLY} a month
          </dd>
        </div>
      </dl>

      <p className="text-muted mt-4 text-[0.85rem] leading-[1.6]">
        Your {CURRENCY}
        {PRICE_TODAY} covers the first {PROGRAMME_WEEKS} weeks. After that your
        membership continues at {CURRENCY}
        {PRICE_MONTHLY} a month unless you cancel, and we will remind you before
        that first payment.
      </p>

      <div className="text-muted mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.85rem]">
        <ManageBillingButton sessionId={sessionId} />
        <Link href="/support" className="text-text underline">
          Talk to the team
        </Link>
      </div>
    </div>
  );
}
