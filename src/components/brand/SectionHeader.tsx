import { cn } from "@/lib/cn";

import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

type SectionHeaderProps = {
  eyebrow: React.ReactNode;
  heading: React.ReactNode;
  lead?: React.ReactNode;
  align?: "start" | "center";
  headingChars?: number;
  leadChars?: number;
  className?: string;
};

// Canonical section-header rhythm. Gaps are tokenised so .landing-dense can
// compress them without rewriting every section.
export function SectionHeader({
  eyebrow,
  heading,
  lead,
  align = "start",
  headingChars,
  leadChars = 54,
  className,
}: SectionHeaderProps) {
  return (
    <div
      data-section-header
      className={cn(align === "center" && "text-center", className)}
    >
      <Reveal>
        <Eyebrow align={align}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delayMs={60}>
        <SectionHeading
          align={align}
          maxChars={headingChars}
          data-section-title
          className="mt-[length:var(--landing-header-gap,0.875rem)]"
        >
          {heading}
        </SectionHeading>
      </Reveal>
      {lead && (
        <Reveal delayMs={120}>
          <p
            data-section-lead
            className={cn(
              "text-muted mt-[length:var(--landing-lead-gap,1.125rem)] text-lead leading-[1.55]",
              align === "center" && "mx-auto",
            )}
            style={{ maxWidth: `${leadChars}ch` }}
          >
            {lead}
          </p>
        </Reveal>
      )}
    </div>
  );
}
