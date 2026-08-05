export type ChatMessage = {
  from: "coach" | "user";
  text: string;
  time?: string;
};

// Hero phone mockup (landing). Animated typing sequence.
export const heroChat: ChatMessage[] = [
  {
    from: "coach",
    text: "Day 12. How did training feel yesterday?",
    time: "7:02",
  },
  { from: "user", text: "Heavy. Legs are wrecked 😅", time: "7:05" },
  {
    from: "coach",
    text: "Good. That’s growth. 30g protein within the hour.",
    time: "7:05",
  },
  { from: "user", text: "On it. Swap rows for pull-ups?", time: "7:06" },
  {
    from: "coach",
    text: "Yes, same target. Film a set and send it over.",
    time: "7:06",
  },
  {
    from: "coach",
    text: "And drink water. You came up short Tuesday 👀",
    time: "7:07",
  },
];

// Solution section (landing) + How It Works — static exchange.
export const solutionChat: ChatMessage[] = [
  {
    from: "coach",
    text: "It’s 9:10pm. You’ve not logged dinner. What did you have?",
  },
  {
    from: "user",
    text: "Chicken, rice, salad. Movie night so ice cream too 🍦",
  },
  {
    from: "coach",
    text: "Solid meal. The ice cream’s fine. That’s life. Add a 15-min walk tomorrow and we’re square. 👊",
  },
];

// Sign-up rail (waitlist). {waPreview} is filled from the number field.
export const signupRailChat = (waPreview: string): ChatMessage[] => [
  {
    from: "coach",
    text: `Soon as your spot opens, I’ll text ${waPreview} to kick things off. 👊`,
  },
];

// Confirmation (purchase) — coach’s first live message.
export const confirmationChat: ChatMessage[] = [
  {
    from: "coach",
    text: "Welcome in 👊 I’m your coach for the next 8 weeks. First up: what time do you usually train?",
  },
];

// Waitlist Confirmed — reassurance message.
export const waitlistChat: ChatMessage[] = [
  {
    from: "coach",
    text: "You’re in 🙌 I’ll message you right here the moment your spot opens. Sit tight.",
  },
];
