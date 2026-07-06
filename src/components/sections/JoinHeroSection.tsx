import { Reveal } from "@/components/brand/Reveal";
import { joinMobileTicks } from "@/content/waitlist";
import { JoinStepIndicator } from "@/features/waitlist/JoinStepIndicator";

export function JoinHeroSection() {
  return (
    <div className="relative z-1">
      <Reveal>
        <JoinStepIndicator activeStep={0} />
      </Reveal>
      <Reveal delayMs={60}>
        <h1 className="mx-auto max-w-[16ch] text-center text-[clamp(2.1rem,5.6vw,3.4rem)]">
          Join the <em>waitlist.</em>
        </h1>
      </Reveal>
      <Reveal delayMs={120}>
        <p className="text-muted text-lead mx-auto mt-4 max-w-[48ch] text-center leading-relaxed">
          Two minutes to register your interest. We’ll email you the moment a
          spot opens. No payment today.
        </p>
      </Reveal>
      <Reveal delayMs={150}>
        <ul className="text-muted mx-auto mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[0.82rem] min-[900px]:hidden">
          {joinMobileTicks.map((tick) => (
            <li key={tick} className="flex items-center gap-[7px]">
              <span aria-hidden className="text-red">
                ✓
              </span>
              {tick}
            </li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}
