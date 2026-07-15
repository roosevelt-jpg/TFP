"use client";

import { CtaButton } from "@/components/brand/CtaButton";
import { clearTrackingConsent } from "@/lib/tracking-consent";

// Sits under the privacy policy (LegalLayout provides the section shell):
// clearing the stored decision reopens the consent banner, which keeps the
// banner's "change your mind" promise real.
export function CookieChoices() {
  return (
    <>
      <p className="text-muted mb-3">
        You can change your analytics and advertising cookie choice at any time.
        Clearing it brings the consent banner back so you can decide again.
      </p>
      <CtaButton
        as="button"
        variant="ghost"
        size="sm"
        withArrow={false}
        withShine={false}
        onClick={clearTrackingConsent}
      >
        Change my cookie choice
      </CtaButton>
    </>
  );
}
