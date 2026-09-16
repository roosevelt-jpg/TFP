"use client";

import type { ReactNode } from "react";

import { trackEvent } from "@/lib/analytics";

export function TrackCta({
  placement,
  children,
}: {
  placement: string;
  children: ReactNode;
}) {
  return (
    <span
      onClick={() => trackEvent("cta_click", { placement })}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          trackEvent("cta_click", { placement });
        }
      }}
    >
      {children}
    </span>
  );
}
