"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

// One of the cases React's docs keep in an Effect: the reason to send this is
// that the page was displayed, not that anyone interacted.
//
// The success page re-renders on every reload and on every router.refresh from
// the coaching form, so the send is keyed on the purchase. sessionStorage
// rather than a module flag: state and module scope both reset on reload,
// which is the case being guarded against.
export function TrackPurchase({
  orderRef,
  value,
  currency,
}: {
  orderRef: string;
  value: number;
  currency: string;
}) {
  useEffect(() => {
    const key = `purchase_tracked:${orderRef}`;

    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing blocks sessionStorage. Fall through and track anyway:
      // a duplicate is better than losing the conversion.
    }

    trackEvent("purchase_completed", { orderRef, value, currency });
  }, [orderRef, value, currency]);

  return null;
}
