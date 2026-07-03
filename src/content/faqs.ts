export type Faq = {
  q: string;
  a: string;
};

// Shown on /faq (full list) and the landing FAQ section.
// Copy is production-final and in Kane’s voice — keep the tone if editing.
export const faqs: Faq[] = [
  {
    q: "How does the Performance Coach actually work?",
    a: "Once your spot opens and you’re in, you connect on WhatsApp in about 30 seconds. Your coach messages you there like a normal chat — it checks in, asks what you ate and how training went, answers questions and adjusts as you go. No new app to learn.",
  },
  {
    q: "Is it really Kane, or a bot?",
    a: "Your Performance Coach is powered by AI — trained on Kane’s own coaching, programming and nutrition principles, so it sounds and pushes like him, 24/7. Kane oversees the system and drops in personally. You get his method at a scale one human never could.",
  },
  {
    q: "What’s in the 8-week programme?",
    a: "A complete progressive training plan (gym or home), a flexible nutrition framework with targets and swaps, warm-ups, mobility and a weekly structure. It lands in your inbox the moment your spot opens — yours to keep.",
  },
  {
    q: "Tell me about the £79/month after.",
    a: "Your £149 covers the programme plus your Performance Coach for the first 8 weeks. To keep your coach beyond that it’s £79/month. Most people stay because the accountability is the part that works — but it’s entirely your call.",
  },
  {
    q: "How do I cancel?",
    a: "Cancelling is easy — email the team from the support page and we’ll take care of it, usually the same day. No phone calls, no retention hoops, no guilt trips. You keep the programme files either way, and the door’s always open if you want back in.",
  },
  {
    q: "What if it’s not for me?",
    a: "You’re covered by a 14-day money-back guarantee. Start the programme, talk to your coach, and if it isn’t right, email us within 14 days for a full refund.",
  },
  {
    q: "What equipment and level do I need?",
    a: "Beginner to advanced all work. Tell your coach what you’ve got — full gym, a few dumbbells, or just bodyweight — and the plan adapts to you.",
  },
  {
    q: "How quickly do I get everything?",
    a: "Right now we’re in early-access waitlist mode — join and we’ll email you the moment a spot opens. Once you’re in, your programme is emailed instantly and your Performance Coach is ready on WhatsApp the same day.",
  },
];
