"use client";

import { useTypewriter } from "@/hooks/use-typewriter";

type TypewriterProps = {
  phrases: string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
};

export function Typewriter({ phrases, ...opts }: TypewriterProps) {
  const text = useTypewriter(phrases, opts);
  return (
    <span className="relative inline-block max-w-full whitespace-nowrap">
      <span aria-hidden className="invisible">
        {phrases.reduce((a, b) => (a.length >= b.length ? a : b), "")}
      </span>
      <span className="absolute inset-x-0 top-0 whitespace-nowrap">
        <i className="italic">{text}</i>
        <span
          aria-hidden
          className="bg-red ml-1 inline-block h-[0.74em] w-0.5 align-[-2px] motion-safe:animate-[caret_1.05s_step-end_infinite]"
        />
      </span>
    </span>
  );
}
