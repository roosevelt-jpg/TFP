import { Reveal } from "@/components/brand/Reveal";
import { WaitlistAside } from "@/features/waitlist/WaitlistAside";
import { WaitlistForm } from "@/features/waitlist/WaitlistForm";
import { WhatYouGetCard } from "@/features/waitlist/WhatYouGetCard";

export function JoinFormSection() {
  return (
    <div className="mt-[clamp(34px,5vw,52px)] grid gap-[clamp(26px,4vw,52px)] min-[900px]:grid-cols-[1.08fr_0.92fr] min-[900px]:items-start">
      <Reveal delayMs={160}>
        <WaitlistForm />
      </Reveal>
      <WaitlistAside />
      {/* The rail is desktop-only; keep the value list visible on mobile. */}
      <WhatYouGetCard className="min-[900px]:hidden" />
    </div>
  );
}
