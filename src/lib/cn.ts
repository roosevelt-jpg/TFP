import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our design tokens add custom font sizes to the `--text-*` namespace
// (display, h2, h3, lead, eyebrow). Register them in the `text` theme scale so
// tailwind-merge treats them as font sizes — otherwise it reads e.g.
// `text-eyebrow` as a text-color and silently drops it when merged next to
// `text-dim`, leaving the element at the inherited 16px.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h2", "h3", "lead", "eyebrow"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
