import "server-only";

import { getStripe } from "@/lib/clients/stripe";
import { env } from "@/env";

// Cached per instance: the URL only changes when the bootstrap runs.
let loginUrl: string | null = null;

// The permanent way in, for emails a customer might open weeks later. A portal
// session would have expired by then; this asks them for their email and sends
// a one-time passcode. prefilled_email skips a step when we know who they are.
export async function portalLoginUrl(email?: string): Promise<string | null> {
  if (!loginUrl) {
    const stripe = await getStripe();
    const { data } = await stripe.billingPortal.configurations
      .list({ limit: 10 })
      .catch(() => ({ data: [] }));

    const ours = data.find(
      (config) => config.metadata?.managed_by === "the-formula-programme",
    );

    loginUrl = ours?.login_page.url ?? null;
  }

  if (!loginUrl) return null;
  return email
    ? `${loginUrl}?prefilled_email=${encodeURIComponent(email)}`
    : loginUrl;
}

// A portal session is a short-lived deep link, so it's only ever created for
// someone we've already identified. Anyone else uses the login link, where
// Stripe emails them a one-time passcode.
export async function createPortalSession(
  stripeCustomerId: string,
  returnPath: string,
): Promise<string | null> {
  const stripe = await getStripe();
  const session = await stripe.billingPortal.sessions
    .create({
      customer: stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}${returnPath}`,
    })
    .catch(() => null);

  return session?.url ?? null;
}
