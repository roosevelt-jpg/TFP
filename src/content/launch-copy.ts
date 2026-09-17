import { PAYMENTS_LIVE } from "@/lib/launch";
import {
  CURRENCY,
  PRICE_MONTHLY,
  PRICE_TODAY,
  PROGRAMME_WEEKS,
} from "@/lib/pricing";

// Every phrase that changes when the doors open. Kept in one place because the
// alternative is a ternary at twenty call sites, and one of them would get
// missed — leaving a paid site telling people to join a waitlist.
//
// Pre-launch strings stay exactly as they were, so nothing changes until the
// flag flips.

const waiting = {
  cta: "Join the Waitlist",
  ctaLower: "Join the waitlist",
  ctaShort: "Join the waitlist",
  heading: "Get on the list",
  // Sits under the CTA on the pricing card.
  reassurance:
    "No payment to join the waitlist. When your spot opens you’ll lock in this price, then cancel anytime, no retention hoops.",
  priceLead: "Joining the waitlist is free. When early access opens it’s",
  finalCta:
    "Join the waitlist and be first in line when early access opens. The programme starts the day you’re in.",
  stickyLabel: "Join the waitlist",
  stickySecondary: `${CURRENCY}${PRICE_TODAY} at launch \u00b7 no payment now`,
  // The reassurance row under the final CTA.
  trust: [
    "No payment to join",
    "early-access pricing",
    "be first when we launch",
  ],
  // The first two of the three "how this works" steps. Step three ("Show up")
  // is true either way.
  steps: {
    one: {
      title: "Join the waitlist",
      body: "Register your interest in under a minute. No payment now. You\u2019re just reserving your spot.",
    },
    two: {
      title: "Get your invite",
      body: "When your spot opens we\u2019ll email you to claim your place. Then your programme and WhatsApp coach unlock instantly.",
    },
  },
  howItWorksStepOneBody:
    "Tell us your goal and where to reach you. Takes under a minute. No payment now.",
  faqAccess: "Once your spot opens and you\u2019re in,",
  faqDelivery: "the moment your spot opens",
  announcement: "First cohort opening soon, limited spots on the waiting list",
  heroTrust: `No payment to join \u00b7 ${CURRENCY}${PRICE_TODAY} at launch`,
  pricingLock: "No payment to join today",
  howItWorksDescription:
    "Kane\u2019s 8-week method, delivered by an AI Performance Coach in your WhatsApp. No new app. Join the waitlist, get the programme instantly, and show up.",
  faqCancel:
    "Cancelling is easy: email the team from the support page and we\u2019ll take care of it, usually the same day. No phone calls, no retention hoops, no guilt trips. You keep the programme files either way, and the door\u2019s always open if you want back in.",
  faqSpeed:
    "Right now we\u2019re in early-access waitlist mode. Join and we\u2019ll email you the moment a spot opens. Once you\u2019re in, your programme is emailed instantly and your Performance Coach is ready on WhatsApp the same day.",
} as const;

const live = {
  cta: "Start My Eight-Week Programme",
  ctaLower: "Start my eight-week programme",
  ctaShort: "Start today",
  heading: "Start today",
  reassurance: `${CURRENCY}${PRICE_TODAY} today, then ${CURRENCY}${PRICE_MONTHLY} a month from week ${PROGRAMME_WEEKS}. Cancel anytime, no retention hoops.`,
  priceLead: "The programme is",
  finalCta:
    "Your programme and your coach are ready the moment you join. No waiting, no invite needed.",
  stickyLabel: "Start My Eight-Week Programme",
  stickySecondary: "First 50 members only",
  trust: [
    `${CURRENCY}${PRICE_TODAY} today`,
    "cancel anytime",
    "your coach is ready now",
  ],
  steps: {
    one: {
      title: "Join today",
      body: `Tell us your goal and where to reach you. ${CURRENCY}${PRICE_TODAY} for the ${PROGRAMME_WEEKS} weeks, then ${CURRENCY}${PRICE_MONTHLY} a month.`,
    },
    two: {
      title: "Meet your coach",
      body: "Your programme lands in your inbox straight away, and your Performance Coach says hello on WhatsApp the same day.",
    },
  },
  howItWorksStepOneBody: `Tell us your goal and where to reach you. Takes under a minute, and you\u2019re training the same day.`,
  faqAccess: "As soon as you join,",
  faqDelivery: "as soon as you join",
  // The founder offer is public by design: CTA carries FORMULA50 into checkout.
  announcement: "Founder launch: the first 50 members get 50% off",
  announcementHref: "#founder-offer",
  heroTrust: `${CURRENCY}${PRICE_TODAY} today · then ${CURRENCY}${PRICE_MONTHLY}/mo after week ${PROGRAMME_WEEKS}`,
  pricingLock: "Secure checkout, cancel anytime",
  howItWorksDescription:
    "Kane\u2019s 8-week method, delivered by an AI Performance Coach in your WhatsApp. No new app. Join today, get the programme instantly, and show up.",
  faqCancel:
    "In two taps, yourself. Open the billing link in your welcome email, hit cancel, and that\u2019s it. No phone calls, no retention hoops, no guilt trips. You keep access until the end of the month you\u2019ve paid for, you keep the programme files, and the door\u2019s always open if you want back in.",
  faqSpeed:
    "Straight away. Your programme is emailed the moment you join, and your Performance Coach is ready on WhatsApp the same day.",
} as const;

export const launchCopy = PAYMENTS_LIVE ? live : waiting;
