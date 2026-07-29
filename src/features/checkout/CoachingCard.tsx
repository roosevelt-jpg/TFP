import { findCompletedCoachingProfile } from "@/data/payments/queries/find-coaching-profile";
import { GridBackdrop } from "@/components/brand/GridBackdrop";

import { CoachingForm } from "./CoachingForm";
import { CoachingSummary } from "./CoachingSummary";

export async function CoachingCard({
  sessionId,
  customerId,
}: {
  sessionId: string;
  customerId: string;
}) {
  // Read on every render, so a refresh shows the saved answers rather than an
  // empty form that implies the first submission was lost.
  const answers = await findCompletedCoachingProfile(customerId);

  return (
    <div className="border-red/35 relative overflow-hidden rounded-md border bg-bg p-[clamp(22px,4vw,34px)]">
      <GridBackdrop vignette="soft" />
      <div className="relative">
        <div className="mb-3.5 flex items-center gap-2.75">
          <span className="bg-red text-cta-contrast grid size-7.5 place-items-center rounded-full text-[0.92rem] font-bold">
            1
          </span>
          <span className="text-red-bright tracking-label text-[0.7rem] font-semibold uppercase">
            {answers ? "Done" : "Start here"}
          </span>
        </div>
        <h2 className="text-h3 font-body font-semibold">
          {answers
            ? "Your coach has your details"
            : "Tell your coach about you"}
        </h2>

        <div className="mt-6">
          {answers ? (
            <CoachingSummary answers={answers} />
          ) : (
            <>
              <p className="text-muted mb-6 max-w-[52ch] leading-relaxed">
                Your first week is built from these answers rather than a
                template, so it’s worth two minutes now. Leave anything blank
                you’d rather talk through.
              </p>
              <CoachingForm sessionId={sessionId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
