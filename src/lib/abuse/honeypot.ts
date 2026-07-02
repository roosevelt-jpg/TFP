const MIN_FILL_MS = 1500;

// Passive for now: callers log the reason rather than hard-blocking. P4 adds
// Turnstile + rate-limiting that enforce rejection.
export function checkHoneypot(
  honeypot: string | undefined,
  renderedAt: number | undefined,
): string | null {
  if (honeypot && honeypot.length > 0) return "honeypot filled";
  if (renderedAt && Date.now() - renderedAt < MIN_FILL_MS) {
    return "submitted too fast";
  }
  return null;
}
