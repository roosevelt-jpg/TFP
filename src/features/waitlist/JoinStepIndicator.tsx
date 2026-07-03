import { cn } from "@/lib/cn";
import { joinSteps } from "@/content/waitlist";

export function JoinStepIndicator({ activeStep = 0 }: { activeStep?: number }) {
  return (
    <ol className="text-dim mb-[22px] flex items-center justify-center gap-x-1.5 text-[0.6rem] font-semibold tracking-[0.04em] uppercase min-[540px]:gap-x-2.5 min-[540px]:text-[0.72rem] min-[540px]:tracking-label">
      {joinSteps.map((step, i) => (
        <li
          key={step.full}
          className="flex items-center gap-x-1.5 min-[540px]:gap-x-2.5"
        >
          <span
            className={cn(
              "whitespace-nowrap",
              i === activeStep && "text-red-bright",
            )}
          >
            {i + 1} · <span className="min-[540px]:hidden">{step.short}</span>
            <span className="hidden min-[540px]:inline">{step.full}</span>
          </span>
          {i < joinSteps.length - 1 && (
            <span
              aria-hidden
              className="bg-hairline-strong h-px w-4 shrink-0 min-[540px]:w-6"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
