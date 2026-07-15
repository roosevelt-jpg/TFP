"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { CtaButton } from "@/components/brand/CtaButton";
import {
  getStoredTrackingConsent,
  onTrackingConsentChange,
  setTrackingConsent,
} from "@/lib/tracking-consent";

const showBanner = () => getStoredTrackingConsent() === undefined;
const hiddenOnServer = () => false;

export function ConsentBanner() {
  const open = useSyncExternalStore(
    onTrackingConsentChange,
    showBanner,
    hiddenOnServer,
  );

  if (!open) return null;

  return (
    // z-70: above the mobile StickyCtaBar (z-60); deciding consent takes
    // priority over a CTA bar that is covered only until a choice is made.
    // Bottom offset clears the iOS home-indicator zone, like StickyCtaBar.
    <section
      aria-label="Cookies and analytics"
      className="border-hairline-strong bg-surface fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom,0px))] z-70 mx-auto max-w-xl rounded-xs border p-4 sm:p-5"
    >
      {/* GDPR floor, nothing above it: purposes, voluntariness, withdrawal,
          details link. Tool names live in the linked policy. */}
      <p className="text-dim text-sm leading-relaxed">
        We use cookies to understand how the site is used, improve it, and
        measure our advertising. Nothing is tracked until you choose, and you
        can change your mind at any time. See our{" "}
        <Link
          href="/privacy"
          className="text-text underline underline-offset-2"
        >
          Privacy Policy
        </Link>{" "}
        for details.
      </p>
      {/* Equal prominence: ICO guidance treats a nudged decline as tainting
          the consent itself, so both choices carry the same weight. */}
      <div className="mt-3 flex gap-3">
        <CtaButton
          as="button"
          variant="ghost"
          size="sm"
          withArrow={false}
          withShine={false}
          onClick={() => setTrackingConsent("granted")}
        >
          Accept
        </CtaButton>
        <CtaButton
          as="button"
          variant="ghost"
          size="sm"
          withArrow={false}
          withShine={false}
          onClick={() => setTrackingConsent("denied")}
        >
          Decline
        </CtaButton>
      </div>
    </section>
  );
}
