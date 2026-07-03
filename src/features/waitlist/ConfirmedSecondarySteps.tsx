import { confirmedSecondarySteps } from "@/content/waitlist";

function renderBody(body: string, strong?: string) {
  if (!strong) return body;
  const [before, after] = body.split(strong);
  return (
    <>
      {before}
      <b className="text-text font-semibold">{strong}</b>
      {after}
    </>
  );
}

export function ConfirmedSecondarySteps() {
  return (
    <div className="grid gap-4">
      {confirmedSecondarySteps.map(({ step, title, body, strong }) => (
        <div
          key={step}
          className="border-hairline rounded-md border bg-bg p-[clamp(22px,4vw,30px)]"
        >
          <div className="mb-3 flex items-center gap-[11px]">
            <span className="bg-surface-2 border-hairline-strong text-muted grid size-[30px] place-items-center rounded-full border text-[0.92rem] font-bold">
              {step}
            </span>
            <h3 className="text-h3 font-semibold">{title}</h3>
          </div>
          <p className="text-muted max-w-[60ch] leading-relaxed">
            {renderBody(body, strong)}
          </p>
        </div>
      ))}
    </div>
  );
}
