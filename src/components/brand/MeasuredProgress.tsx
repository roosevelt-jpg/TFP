"use client";

import { useRef } from "react";

import { useReducedMotion, useScroll, useSpring } from "motion/react";
import * as m from "motion/react-m";

import { Eyebrow } from "./Eyebrow";

type MeasuredProgressProps = {
  benchmarks: string[];
};

export function MeasuredProgress({ benchmarks }: MeasuredProgressProps) {
  const reduce = useReducedMotion();
  const barRef = useRef<HTMLDivElement>(null);
  // Fill tracks scroll position through the bar, so it grows and shrinks as the
  // section moves across the viewport — mirroring the design's scroll-driven bar.
  // A wider offset range makes it fill more gradually; the spring smooths it.
  const { scrollYProgress } = useScroll({
    target: barRef,
    offset: ["start 0.95", "center 0.5"],
  });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 22,
    restDelta: 0.001,
  });

  return (
    <div className="border-hairline mt-[clamp(46px,6vw,70px)] border-t pt-[clamp(30px,4vw,44px)] text-center">
      <Eyebrow align="center" className="mb-3.5">
        Measured progress
      </Eyebrow>
      <p className="font-display mx-auto max-w-[22ch] text-[clamp(1.5rem,3.4vw,2.1rem)] leading-[1.1]">
        Four benchmarks. <em>Proof you can see.</em>
      </p>
      <p className="text-muted mx-auto mt-3.5 mb-[26px] max-w-[52ch] leading-[1.6]">
        We test four benchmarks in week one and re-test them in week eight — so
        your progress is measured from your own starting point, never guessed.
      </p>
      <div className="mb-[30px] flex flex-wrap justify-center gap-2.5">
        {benchmarks.map((benchmark) => (
          <span
            key={benchmark}
            className="bg-bg border-hairline-strong rounded-full border px-4 py-[9px] text-[0.82rem]"
          >
            {benchmark}
          </span>
        ))}
      </div>
      <div
        ref={barRef}
        className="bg-surface-2 border-hairline relative mx-auto h-1.5 max-w-[720px] overflow-hidden rounded-xs border"
      >
        <m.div
          className="bg-red absolute inset-0 origin-left rounded-xs"
          style={{ scaleX: reduce ? 1 : scaleX }}
        />
      </div>
      <div className="text-dim mx-auto mt-[11px] flex max-w-[720px] items-center justify-between gap-3.5 text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        <span>Week 01 · Baseline</span>
        <span>Week 08 · Re-test</span>
      </div>
    </div>
  );
}
