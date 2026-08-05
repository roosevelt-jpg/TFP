import { launchCopy } from "@/content/launch-copy";
// Structured content for repeated marketing blocks. Keeps copy out of components.

export type Benefit = {
  title: string;
  body: string;
};

// Solution section capability rows (landing + How It Works).
export const coachCapabilities: Benefit[] = [
  {
    title: "Checks in first",
    body: "Proactive messages before you think to open it. The days you’d skip are the days it shows up.",
  },
  {
    title: "Answers anything",
    body: "Form, a swap, what to order out: ask in plain English, get a straight answer in seconds.",
  },
  {
    title: "Knows your plan",
    body: "It tracks where you are in the eight weeks and adapts to how your week actually went.",
  },
  {
    title: "Won’t let you coast",
    body: "Missed a session? It’ll know. Expect a nudge, not a lecture.",
  },
];

// How It Works page — the three-step walkthrough.
export const howItWorksSteps: Benefit[] = [
  {
    title: launchCopy.steps.one.title,
    body: launchCopy.howItWorksStepOneBody,
  },
  {
    title: "Get the lot, instantly",
    body: "Your programme lands in your inbox and your coach says hello on WhatsApp. Set up before your coffee’s brewed.",
  },
  {
    title: "Show up. It does the rest",
    body: "Daily check-ins, instant answers and the nudges that keep you honest. You bring the work; it brings the accountability.",
  },
];

// Measured-progress benchmarks (landing).
export const benchmarks: string[] = [
  "Strength",
  "Conditioning",
  "Body composition",
  "Work capacity",
];

// Community section (landing). Trimmed to the client's three labels, one
// short line each.

// Pricing card feature list (landing).
export const pricingFeatures: string[] = [
  "Full 8-week training + nutrition programme, yours to keep",
  "Personal Performance Coach in WhatsApp, in Kane’s voice, for 8 weeks",
  "Weekly check-ins, plus answers whenever you need them",
];

// Outcome pillars (landing, OutcomeSection). Sells the result, not the
// WhatsApp mechanism.
export const outcomes: Benefit[] = [
  {
    title: "Lose fat",
    body: "A nutrition framework with real targets and swaps, built to hold up against a takeaway on a Friday, not just a good week.",
  },
  {
    title: "Build muscle",
    body: "Progressive training, gym or home, that adds load week on week so eight weeks in you’re visibly, measurably stronger.",
  },
  {
    title: "Perform better",
    body: "More strength, more conditioning, more work capacity. The kind of fitness that shows up outside the gym too.",
  },
];

// Consolidated WhatsApp coach feature block (landing, FeaturesSection). The
// one place this mechanism is explained; replaces the repetition previously
// spread across coachCapabilities/included/pricingFeatures on the landing page.
export const features: Benefit[] = [
  {
    title: "It messages you first",
    body: "Your coach opens the conversation, most days before you’ve had your coffee.",
  },
  {
    title: "Ask it literally anything",
    body: "Stuck on a lift, tempted by a takeaway, unsure what to swap dinner for: ask and get a straight answer in seconds.",
  },
  {
    title: "It moves with your week",
    body: "Train four days instead of five, sleep badly, travel for work: your targets shift to match.",
  },
  {
    title: "There’s nowhere to hide",
    body: "Skip a session and it’s flagged the same day. No shame, just a nudge back on track.",
  },
];
