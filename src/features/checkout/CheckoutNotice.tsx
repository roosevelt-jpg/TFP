import type { ReactNode } from "react";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { Reveal } from "@/components/brand/Reveal";

// The non-success outcomes: still processing, or nothing we can show.
export function CheckoutNotice({
  eyebrow,
  heading,
  body,
  cta,
}: {
  eyebrow: string;
  heading: ReactNode;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <section
      role="status"
      className="relative mx-auto max-w-170 px-(--gutter) pt-[clamp(30px,6vw,64px)] pb-[clamp(56px,10vw,120px)] text-center"
    >
      <GridBackdrop vignette="soft" />
      <Reveal>
        <Eyebrow align="center">{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delayMs={60}>
        <h1 className="text-display mt-4 text-balance">{heading}</h1>
      </Reveal>
      <Reveal delayMs={120}>
        <p className="text-muted text-lead mx-auto mt-4.5 max-w-[46ch] leading-[1.6]">
          {body}
        </p>
      </Reveal>
      {cta && (
        <Reveal delayMs={180}>
          <div className="mt-6 flex justify-center">
            <CtaButton href={cta.href} size="lg" withArrow={false}>
              {cta.label}
            </CtaButton>
          </div>
        </Reveal>
      )}
    </section>
  );
}
