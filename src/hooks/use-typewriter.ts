"use client";

import { useState } from "react";

import { useAnimationFrame, useReducedMotion } from "motion/react";

type UseTypewriterOptions = {
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
};

function textAt(
  elapsed: number,
  phrases: string[],
  typeMs: number,
  deleteMs: number,
  holdMs: number,
) {
  const cycles = phrases.map(
    (p) => p.length * typeMs + holdMs + p.length * deleteMs,
  );
  const total = cycles.reduce((a, b) => a + b, 0);
  let t = elapsed % total;

  for (let i = 0; i < phrases.length; i++) {
    if (t < cycles[i]) {
      const phrase = phrases[i];
      const typeDur = phrase.length * typeMs;
      const holdDur = holdMs;
      if (t < typeDur) return phrase.slice(0, Math.ceil(t / typeMs));
      if (t < typeDur + holdDur) return phrase;
      const deleting = t - typeDur - holdDur;
      return phrase.slice(0, phrase.length - Math.ceil(deleting / deleteMs));
    }
    t -= cycles[i];
  }
  return phrases[0] ?? "";
}

export function useTypewriter(
  phrases: string[],
  { typeMs = 62, deleteMs = 34, holdMs = 1400 }: UseTypewriterOptions = {},
) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(phrases[0] ?? "");

  useAnimationFrame((time) => {
    if (reduce || phrases.length === 0) return;
    const next = textAt(time, phrases, typeMs, deleteMs, holdMs);
    setText((prev) => (prev === next ? prev : next));
  });

  return text;
}
