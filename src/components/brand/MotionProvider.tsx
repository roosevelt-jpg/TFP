"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

type MotionProviderProps = { children: React.ReactNode };

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {/* Reduced-motion handling lives here, not in per-component branches:
          branching on useReducedMotion diverges from the SSR tree and left
          Reveal content stuck at the server-rendered opacity:0. "user" keeps
          opacity animations and drops transforms for Reduce Motion users. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
