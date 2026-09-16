"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

export function TrackPricingView() {
  useEffect(() => {
    trackEvent("view_pricing");
  }, []);
  return null;
}
