import "server-only";

import { env } from "@/env";
import {
  getCmsValue,
  LANDING_CMS_NAMESPACE,
} from "@/lib/cms/store";
import { launchCopy } from "@/content/launch-copy";

export async function getLandingCopy() {
  const [
    announcement,
    heroHeadline,
    heroSubhead,
    cta,
    stickyLabel,
    stickySecondary,
    finalCta,
  ] = await Promise.all([
    getCmsValue(LANDING_CMS_NAMESPACE, "announcement", launchCopy.announcement),
    getCmsValue(
      LANDING_CMS_NAMESPACE,
      "hero.headline",
      "Lose fat. Build muscle. Become stronger, fitter and more functional in 8 weeks.",
    ),
    getCmsValue(
      LANDING_CMS_NAMESPACE,
      "hero.subhead",
      "An 8-week training system with your own Performance Coach inside WhatsApp to keep you accountable every step of the way.",
    ),
    getCmsValue(LANDING_CMS_NAMESPACE, "cta", launchCopy.cta),
    getCmsValue(LANDING_CMS_NAMESPACE, "stickyLabel", launchCopy.stickyLabel),
    getCmsValue(
      LANDING_CMS_NAMESPACE,
      "stickySecondary",
      launchCopy.stickySecondary,
    ),
    getCmsValue(LANDING_CMS_NAMESPACE, "finalCta", launchCopy.finalCta),
  ]);

  return {
    announcement,
    heroHeadline,
    heroSubhead,
    cta,
    stickyLabel,
    stickySecondary,
    finalCta,
    reassurance: launchCopy.reassurance,
    heroTrust: launchCopy.heroTrust,
  };
}

export async function getFounderSeatsRemaining(): Promise<number | null> {
  // Stripe promo redemption count when payments are live; otherwise null.
  if (!env.PAYMENTS_LIVE) return null;
  try {
    const res = await fetch(
      "https://api.stripe.com/v1/promotion_codes?code=FOUNDER&limit=1",
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ times_redeemed?: number; max_redemptions?: number | null }>;
    };
    const promo = json.data?.[0];
    if (!promo?.max_redemptions) return null;
    return Math.max(0, promo.max_redemptions - (promo.times_redeemed ?? 0));
  } catch {
    return null;
  }
}
