// A session id sits in browser history and forwarded links forever, so the
// screen that shows a reference and an editable coaching form is time-boxed.
// Seven days covers the 24h resume email and the 48h owner escalation. After
// that the link stops opening the form. Fulfillment itself is never age-gated:
// a webhook retried late must still pay out.
export const ONBOARDING_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export function isWithinOnboardingWindow(at: Date | number | null): boolean {
  if (at === null) return false;
  const seconds = at instanceof Date ? at.getTime() / 1000 : at;
  return Date.now() / 1000 - seconds <= ONBOARDING_WINDOW_SECONDS;
}
