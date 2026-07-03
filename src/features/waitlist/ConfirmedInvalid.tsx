import { CtaButton } from "@/components/brand/CtaButton";
import { Eyebrow } from "@/components/brand/Eyebrow";

export function ConfirmedInvalid() {
  return (
    <div className="relative z-1 mx-auto max-w-[680px] text-center">
      <Eyebrow align="center" className="mb-[18px]">
        Confirmation not found
      </Eyebrow>
      <h1 className="text-display text-center">
        This link’s <em>expired.</em>
      </h1>
      <p className="text-muted text-lead mx-auto mt-4 max-w-[42ch] text-center leading-relaxed">
        We couldn’t find your sign-up from this link. Check the confirmation
        email we sent, or join the waitlist again below.
      </p>
      <div className="mt-6 flex justify-center">
        <CtaButton href="/join" size="lg" withArrow={false}>
          Join the waitlist
        </CtaButton>
      </div>
    </div>
  );
}
