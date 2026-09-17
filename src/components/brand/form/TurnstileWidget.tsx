"use client";

import type { Ref } from "react";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

type TurnstileWidgetProps = {
  // Binds the token to this form; the server checks it matches (replay defense).
  action: string;
  // null when the token is missing/expired/errored, so the form can re-gate.
  onToken: (token: string | null) => void;
  // Lets the form reset() the widget after a failed submit — the token is
  // consumed server-side, so a retry needs a fresh challenge.
  ref?: Ref<TurnstileInstance | undefined>;
};

export function TurnstileWidget({
  action,
  onToken,
  ref,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return (
      <p className="text-sm text-red-400">
        Turnstile is not configured (NEXT_PUBLIC_TURNSTILE_SITE_KEY).
      </p>
    );
  }

  return (
    <Turnstile
      ref={ref}
      siteKey={siteKey}
      onSuccess={(token) => onToken(token)}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
      options={{ theme: "dark", size: "flexible", action }}
    />
  );
}
