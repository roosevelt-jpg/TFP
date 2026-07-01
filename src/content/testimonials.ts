export type TestimonialData = {
  quote: string;
  name: string;
  detail?: string;
  /** Renders with the red top edge + accent stars. Use for exactly one card. */
  featured?: boolean;
};

// Keep `featured: true` on exactly one (the middle card in the design).
export const testimonials: TestimonialData[] = [
  {
    quote:
      "The check-ins are what changed it. I'd never made it past week three — this time I finished all eight.",
    name: "Jamie T.",
    detail: "Down 7kg",
  },
  {
    quote:
      "It genuinely feels like Kane's texting me. Asked about my dodgy shoulder at 10pm and got a proper answer in seconds.",
    name: "Priya R.",
    detail: "First-ever pull-up",
    featured: true,
  },
  {
    quote:
      "No app to faff with — it's just in my WhatsApp pushing me. Worth every penny next to the PDFs I've binned.",
    name: "Marcus L.",
    detail: "8 weeks, no misses",
  },
];
