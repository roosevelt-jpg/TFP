"use client";

import { useEffect } from "react";

/** Records one landing session a day so funnel rates have a denominator. */
export function TrackLanding() {
  useEffect(() => {
    const key = "tfp_landing_session";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem(key, sessionId);
    }
    const day = new Date().toISOString().slice(0, 10);
    const once = `tfp_landing_${day}`;
    if (sessionStorage.getItem(once)) return;
    sessionStorage.setItem(once, "1");
    void fetch("/api/events/landing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
  }, []);
  return null;
}
