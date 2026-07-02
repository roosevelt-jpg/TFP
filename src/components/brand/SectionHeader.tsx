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

// Canonical section-header rhythm, identical on every section so the page reads
// as one system: eyebrow → 14px → heading → 18px → lead. Reveal stagger 0/60/120.
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
    <div className={cn(align === "center" && "text-center", className)}>
      <Reveal>
        <Eyebrow align={align}>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delayMs={60}>
        <SectionHeading
          align={align}
          maxChars={headingChars}
          className="mt-3.5"
        >
          {heading}
        </SectionHeading>
      </Reveal>
      {lead && (
        <Reveal delayMs={120}>
          <p
            className={cn(
              "text-muted mt-[18px] text-lead leading-[1.6]",
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
