"use client";

import * as m from "motion/react-m";

import { easeOut } from "@/lib/motion";

type RevealProps = React.ComponentPropsWithoutRef<typeof m.div> & {
  delayMs?: number;
};

// Ref, not an effect: fires at hydration commit, and only when motion really
// mounted — the moment the globals.css reveal-rescue stops being needed.
// Declared outside the component, and applied after `...rest`, so a caller
// spreading its own `ref` can't drop the signal.
function markMotionReady(node: HTMLDivElement | null) {
  if (node) document.documentElement.classList.add("motion-ready");
}

// No reduced-motion branch here on purpose: the server can't know the
// preference, so branching desyncs hydration and strands the SSR opacity:0
// (users saw blank pages). MotionProvider's MotionConfig handles it.
export function Reveal({ delayMs = 0, children, ...rest }: RevealProps) {
  return (
    <m.div
      data-reveal
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -7% 0px" }}
      transition={{ duration: 0.7, ease: easeOut, delay: delayMs / 1000 }}
      {...rest}
      ref={markMotionReady}
    >
      {children}
    </m.div>
  );
}
