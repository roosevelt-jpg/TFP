import { CURRENCY, PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";
import { launchCopy } from "@/content/launch-copy";

export type Faq = {
  q: string;
  a: string;
  // Shown on the landing page's condensed FAQ section. /faq always renders
  // the full list regardless of this flag.
  featured?: boolean;
};

// Shown on /faq (full list) and the landing FAQ section.
// Copy is production-final and in Kane’s voice — keep the tone if editing.
export const faqs: Faq[] = [
  {
    q: "How does the Performance Coach actually work?",
    a: `${launchCopy.faqAccess} you connect on WhatsApp in about 30 seconds. Your coach messages you there like a normal chat. It checks in, asks what you ate and how training went, answers questions and adjusts as you go. No new app to learn.`,
    featured: true,
  },
  {
    q: "Is it really Kane, or a bot?",
    a: "Your Performance Coach is powered by AI, trained on Kane’s own coaching, programming and nutrition principles, so it sounds and pushes like him, 24/7. Kane oversees the system and drops in personally. You get his method at a scale one human never could.",
  },
  {
    q: "What’s in the 8-week programme?",
    a: `A complete progressive training plan (gym or home), a flexible nutrition framework with targets and swaps, warm-ups, mobility and a weekly structure. It lands in your inbox ${launchCopy.faqDelivery}, yours to keep.`,
    featured: true,
  },
  {
    q: `Tell me about the ${CURRENCY}${PRICE_MONTHLY}/month after.`,
    a: `Your ${CURRENCY}${PRICE_TODAY} covers the programme plus your Performance Coach for the first 8 weeks. To keep your coach beyond that it’s ${CURRENCY}${PRICE_MONTHLY}/month. Most people stay because the accountability is the part that works, but it’s entirely your call.`,
    featured: true,
  },
  {
    q: "How do I cancel?",
    a: launchCopy.faqCancel,
    featured: true,
  },
  {
    q: "What if it’s not for me?",
    a: "You’re covered by a 14-day money-back guarantee. Start the programme, talk to your coach, and if it isn’t right, email us within 14 days for a full refund.",
    featured: true,
  },
  {
    q: "Can I share the programme with a friend?",
    a: "The programme is licensed to you personally, and every copy is watermarked with your name and order reference. Sharing, copying or reselling it isn’t allowed. If a mate wants in, send them to the site and they’ll get their own coach with it, which is the part that actually makes it work.",
  },
  {
    q: "What equipment and level do I need?",
    a: "Beginner to advanced all work. Tell your coach what you’ve got (full gym, a few dumbbells, or just bodyweight) and the plan adapts to you.",
    featured: true,
  },
  {
    q: "How quickly do I get everything?",
    a: launchCopy.faqSpeed,
  },
];
