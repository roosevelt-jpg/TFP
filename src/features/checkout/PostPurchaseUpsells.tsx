"use client";

import Link from "next/link";

type Props = {
  stackUrl?: string | null;
  telegramUrl?: string | null;
};

export function PostPurchaseUpsells({ stackUrl, telegramUrl }: Props) {
  if (!stackUrl && !telegramUrl) return null;

  return (
    <div className="border-hairline rounded-md border bg-bg p-[clamp(22px,4vw,30px)]">
      <h3 className="text-h3 font-semibold">Next steps</h3>
      <ul className="mt-4 grid list-none gap-3 p-0">
        {stackUrl ? (
          <li>
            <a
              href={stackUrl}
              className="text-text underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void import("@/lib/analytics").then(({ trackEvent }) =>
                  trackEvent("stack_upsell_clicked", { placement: "success" }),
                );
              }}
            >
              Claim 50% off the Complete Stack
            </a>
            <p className="text-muted mt-1 text-[0.85rem]">
              Optional founder pricing on Male / Female formulas.
            </p>
          </li>
        ) : (
          <li>
            <Link href="/stack" className="text-text underline">
              See the Complete Stack
            </Link>
          </li>
        )}
        {telegramUrl ? (
          <li>
            <a
              href={telegramUrl}
              className="text-text underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Connect Telegram alerts
            </a>
            <p className="text-muted mt-1 text-[0.85rem]">
              Optional. Daily coaching still runs on WhatsApp.
            </p>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
