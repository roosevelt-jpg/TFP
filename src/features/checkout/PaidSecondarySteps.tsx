import { paidSecondarySteps } from "@/content/checkout";

export function PaidSecondarySteps() {
  return (
    <div className="grid gap-4">
      {paidSecondarySteps.map(({ step, title, body }) => (
        <div
          key={step}
          className="border-hairline rounded-md border bg-bg p-[clamp(22px,4vw,30px)]"
        >
          <div className="mb-3 flex items-center gap-2.75">
            <span className="bg-surface-2 border-hairline-strong text-muted grid size-7.5 place-items-center rounded-full border text-[0.92rem] font-bold">
              {step}
            </span>
            <h3 className="text-h3 font-semibold">{title}</h3>
          </div>
          <p className="text-muted max-w-[60ch] leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  );
}
