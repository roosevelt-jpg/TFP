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

// "What’s included" cards (landing).
export const included: Benefit[] = [
  {
    title: "The 8-week programme",
    body: "Progressive training (gym or home) and a flexible nutrition framework with targets and swaps. In your inbox the moment you’re in, yours to keep for good.",
  },
  {
    title: "Weekly check-ins",
    body: "Your coach reviews the week, banks the wins and resets your targets. Accountability that turns up, on the quiet weeks especially.",
  },
  {
    title: "Form & nutrition Q&A",
    body: "Send a form clip, ask for a meal swap, sanity-check a craving at 11pm. A straight, no-nonsense answer in seconds, any hour.",
  },
];

// How-it-works steps (landing + How It Works).
export const steps: Benefit[] = [
  {
    title: launchCopy.steps.one.title,
    body: launchCopy.steps.one.body,
  },
  {
    title: launchCopy.steps.two.title,
    body: launchCopy.steps.two.body,
  },
  {
    title: "Show up",
    body: "Train the plan. Your coach handles the rest: check-ins, answers and the nudges that keep you honest.",
  },
];

// How It Works page — the three-step walkthrough (distinct copy from the
// landing's condensed `steps`).
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

// Community section (landing).
export const community: Benefit[] = [
  {
    title: "Same standard",
    body: "One system, one bar. Everyone training to the level Kane sets. No shortcuts.",
  },
  {
    title: "Real accountability",
    body: "People who show up when you post your session, and notice when you don’t.",
  },
  {
    title: "Same fight",
    body: "Eight weeks, shared. You start together, you finish together.",
  },
];

// Pricing card feature list (landing).
export const pricingFeatures: string[] = [
  "Full 8-week training + nutrition programme, yours to keep",
  "Personal Performance Coach in WhatsApp, in Kane’s voice, for 8 weeks",
  "Proactive weekly check-ins & accountability",
  "Form & nutrition Q&A, any hour",
];
