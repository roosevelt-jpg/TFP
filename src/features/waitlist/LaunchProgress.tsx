"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { easeFill } from "@/lib/motion";

export function LaunchProgress() {
  const reduce = useReducedMotion();

  return (
    <div className="mt-[clamp(36px,5vw,52px)] border-hairline border-t pt-[clamp(28px,4vw,40px)] text-center">
      <p className="font-display mb-4 text-[clamp(1.15rem,2.7vw,1.5rem)]">
        Early access is opening soon.
      </p>
      <div className="bg-surface-2 border-hairline relative mx-auto h-1.5 max-w-[680px] overflow-hidden rounded-xs border">
        <m.div
          className="bg-red absolute inset-0 origin-left rounded-xs"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={reduce ? undefined : { scaleX: 1 }}
          viewport={{ once: true, margin: "0px 0px -7% 0px" }}
          transition={{ duration: 1.2, ease: easeFill }}
        />
      </div>
      <div className="text-dim mx-auto mt-[11px] flex max-w-[680px] justify-between text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        <span>Spot reserved</span>
        <span>Launching soon</span>
      </div>
    </div>
  );
}
