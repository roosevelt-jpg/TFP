import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";

type Item = { q: string; a: string };

export function CompactFaqSection({
  heading,
  items,
}: {
  heading: string;
  items: Item[];
}) {
  return (
    <Section id="faq" divided>
      <SectionHeader align="center" eyebrow="FAQ" heading={heading} />
      <div className="mx-auto mt-8 max-w-[720px]">
        {items.map((item, i) => (
          <Reveal key={item.q} delayMs={i * 40}>
            <details className="border-hairline border-b py-4">
              <summary className="cursor-pointer list-none font-semibold pr-6">
                {item.q}
              </summary>
              <p className="text-muted mt-3 text-[0.95rem] leading-[1.6]">
                {item.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
