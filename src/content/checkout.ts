// A tuple, not string[]: the hero indexes all three, so dropping one should be
// a type error rather than `undefined` in the DOM.
export const paidTrust = [
  "Payment confirmed",
  "Receipt in your inbox",
  "Cancel anytime",
] as const satisfies readonly [string, string, string];

// Steps 1 and 2 are the WhatsApp opt-in and the coaching form, both on the page
// itself, so these pick up from 3.
export const paidSecondarySteps = [
  {
    step: 3,
    title: "Your programme lands by email",
    body: "Your personalised plan is on its way to your inbox, along with your receipt. Check spam if it hasn’t arrived within a few minutes.",
  },
  {
    step: 4,
    title: "Your first week is built around you",
    body: "Kane’s team picks up from your answers and your first block starts. Everything after this happens on WhatsApp, so keep the thread handy.",
  },
];
