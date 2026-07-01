"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";

import { easeOut } from "@/lib/motion";

type RevealProps = React.ComponentPropsWithoutRef<typeof m.div> & {
  delayMs?: number;
};

export function Reveal({ delayMs = 0, children, ...rest }: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <m.div {...rest}>{children}</m.div>;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -7% 0px" }}
      transition={{ duration: 0.7, ease: easeOut, delay: delayMs / 1000 }}
      {...rest}
    >
      {children}
    </m.div>
  );
}
