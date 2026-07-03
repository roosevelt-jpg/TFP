"use client";

import { captureAttribution } from "@/lib/waitlist/attribution";

if (typeof window !== "undefined") {
  captureAttribution();
}

// Renders nothing; it exists only so the layout imports this client module.
export function AttributionCapture() {
  return null;
}
