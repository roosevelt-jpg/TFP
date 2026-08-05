import { SectionHeader } from "@/components/brand/SectionHeader";
import { Section } from "@/components/layout/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/content/faqs";

const featuredFaqs = faqs.filter((faq) => faq.featured);

export function FaqSection() {
  return (
    <Section id="faq" divided containerWidth="narrow">
      <SectionHeader
        eyebrow="Questions"
        heading="Everything else you’re wondering."
        className="mb-[34px]"
      />
      <Accordion>
        {featuredFaqs.map((faq) => (
          <AccordionItem key={faq.q} value={faq.q}>
            <AccordionTrigger>{faq.q}</AccordionTrigger>
            <AccordionContent>{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
