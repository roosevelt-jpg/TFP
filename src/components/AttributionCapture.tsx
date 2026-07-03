"use client";

import { captureAttribution } from "@/lib/waitlist/attribution";

// Run once at module init (fires on first load) rather than in an effect.
if (typeof window !== "undefined") {
  captureAttribution();
}

export function AttributionCapture() {
  return null;
}
