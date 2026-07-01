"use client";

import { domAnimation, LazyMotion } from "motion/react";

type MotionProviderProps = { children: React.ReactNode };

export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
