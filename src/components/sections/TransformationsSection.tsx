import { Reveal } from "@/components/brand/Reveal";
import { SectionHeader } from "@/components/brand/SectionHeader";
import { TransformationCard } from "@/components/brand/TransformationCard";
import { Section } from "@/components/layout/Section";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { transformations } from "@/content/transformations";

export function TransformationsSection() {
  return (
    <Section divided>
      <SectionHeader
        eyebrow="The difference"
        heading="Results of accountability."
        headingChars={22}
        leadChars={44}
        lead="Real people. Real discipline. Real results."
      />
      <Carousel
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="mt-11"
        aria-label="Member transformations"
      >
        <CarouselContent>
          {transformations.map((item, i) => (
            <CarouselItem
              key={item.name}
              className="basis-[85%] md:basis-1/2 min-[1180px]:basis-1/3"
            >
              <Reveal delayMs={Math.min(i, 2) * 80} className="h-full">
                <TransformationCard
                  name={item.name}
                  image={item.image}
                  quote={item.quote}
                  priority={i === 0}
                />
              </Reveal>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="mt-7 flex justify-end gap-2.5">
          <CarouselPrevious className="border-hairline-strong static size-9 translate-y-0 rounded-xs" />
          <CarouselNext className="border-hairline-strong static size-9 translate-y-0 rounded-xs" />
        </div>
      </Carousel>
    </Section>
  );
}
