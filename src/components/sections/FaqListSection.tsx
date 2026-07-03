import { Container } from "@/components/layout/Container";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/content/faqs";

export function FaqListSection() {
  return (
    <section className="relative pb-[clamp(30px,5vw,48px)]">
      <Container>
        <h2 className="sr-only">Questions and answers</h2>
        <Accordion defaultValue={[faqs[0].q]}>
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger>{faq.q}</AccordionTrigger>
              <AccordionContent>{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  );
}
