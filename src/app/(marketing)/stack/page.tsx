import type { Metadata } from "next";
import Link from "next/link";

import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import { env } from "@/env";
import { SIGNUP_HREF } from "@/lib/launch";

export const metadata: Metadata = {
  title: "Complete Stack",
  description:
    "The Formula Male and Female Complete Stack — training fuel alongside the programme.",
};

const FOOTER_LINKS = [
  { label: "Programme", href: "/" },
  { label: "Support", href: "/support" },
];

function stackEnabled() {
  return (
    env.COMPLETE_STACK_ENABLED === true ||
    String(env.COMPLETE_STACK_ENABLED) === "true"
  );
}

export default function CompleteStackPage() {
  const enabled = stackEnabled();
  const male = env.COMPLETE_STACK_MALE_URL ?? env.COMPLETE_STACK_URL;
  const female = env.COMPLETE_STACK_FEMALE_URL ?? env.COMPLETE_STACK_URL;
  const generic = env.COMPLETE_STACK_URL;

  return (
    <>
      <SkipLink />
      <SiteHeader
        variant="minimal"
        cta={
          <CtaButton href={SIGNUP_HREF} size="sm">
            Start the programme
          </CtaButton>
        }
      />

      <main id="main" className="relative z-10">
        <section className="relative py-[clamp(40px,8vw,80px)]">
          <GridBackdrop vignette="hero" />
          <Container width="narrow" className="relative z-1 text-center">
            <Eyebrow align="center">Supplements</Eyebrow>
            <h1 className="text-display mt-4">
              The <em>Complete Stack</em>
            </h1>
            <p className="text-muted text-lead mx-auto mt-4.5 max-w-[44ch] leading-[1.6]">
              Founder members get 50% off the Formula Male or Female stack
              alongside the programme. Training is the product — the stack is
              optional fuel.
            </p>
          </Container>
        </section>

        <Section divided>
          <SectionHeader
            align="center"
            eyebrow="Choose your stack"
            heading="Male or Female formulas"
          />
          {!enabled || (!male && !female && !generic) ? (
            <p className="text-muted mx-auto mt-8 max-w-[40ch] text-center text-[0.95rem]">
              Stack checkout opens with the founder launch. Join the programme
              first — your welcome email will carry the stack link when it’s
              live.
            </p>
          ) : (
            <div className="mx-auto mt-10 grid max-w-[720px] gap-4 md:grid-cols-2">
              {male ? (
                <a
                  href={male}
                  className="border-hairline-strong block rounded-xs border p-6 text-left transition hover:border-[var(--red)]"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="text-h3 font-semibold">Male Complete Stack</div>
                  <p className="text-muted mt-2 text-[0.9rem] leading-[1.55]">
                    Open the storefront to claim founder pricing.
                  </p>
                </a>
              ) : null}
              {female ? (
                <a
                  href={female}
                  className="border-hairline-strong block rounded-xs border p-6 text-left transition hover:border-[var(--red)]"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="text-h3 font-semibold">
                    Female Complete Stack
                  </div>
                  <p className="text-muted mt-2 text-[0.9rem] leading-[1.55]">
                    Open the storefront to claim founder pricing.
                  </p>
                </a>
              ) : null}
              {!male && !female && generic ? (
                <a
                  href={generic}
                  className="border-hairline-strong col-span-full block rounded-xs border p-6 text-center"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="text-h3 font-semibold">Shop the Complete Stack</div>
                </a>
              ) : null}
            </div>
          )}

          <p className="text-muted mx-auto mt-10 max-w-[44ch] text-center text-[0.85rem]">
            Prefer to start training first?{" "}
            <Link href={SIGNUP_HREF} className="text-text underline">
              Start My Eight-Week Programme
            </Link>
            .
          </p>
        </Section>
      </main>

      <SiteFooter links={FOOTER_LINKS} />
    </>
  );
}
