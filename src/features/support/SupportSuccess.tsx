import { CtaButton } from "@/components/brand/CtaButton";

type SupportSuccessProps = {
  name: string;
  email: string;
  typeLabel: string;
  isCancel: boolean;
  onReset: () => void;
};

export function SupportSuccess({
  name,
  email,
  typeLabel,
  isCancel,
  onReset,
}: SupportSuccessProps) {
  return (
    <div
      // Focus the card as React commits it (it replaces the form on submit, so
      // there's no event handler to do this in) — lands keyboard/SR users on
      // the confirmation instead of the now-detached submit button.
      ref={(node) => node?.focus()}
      tabIndex={-1}
      role="status"
      className="bg-bg border-hairline border-t-red shadow-card mt-[30px] rounded-md border border-t-2 p-[clamp(26px,4vw,38px)] outline-none"
    >
      <h2 className="text-[clamp(1.5rem,3.6vw,2rem)]">
        Thanks, {name} — <em>we’re on it.</em>
      </h2>
      <p className="text-muted mt-3.5 leading-relaxed">
        We’ve logged your <b className="text-text font-semibold">{typeLabel}</b>{" "}
        request and the team will reply to{" "}
        <b className="text-text font-semibold">{email}</b> within one working
        day.
      </p>
      {isCancel && (
        <p className="text-muted mt-3 leading-relaxed">
          You’ll get an email confirming the change. Either way, your 8-week
          programme files stay yours to keep.
        </p>
      )}
      <div className="mt-[22px] flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        <CtaButton
          href="/"
          variant="invert"
          size="sm"
          block
          withArrow={false}
          className="sm:w-auto"
        >
          Back to site
        </CtaButton>
        <button
          type="button"
          onClick={onReset}
          className="border-hairline-strong text-text hover:border-dim inline-flex min-h-11 items-center justify-center rounded-sm border px-[22px] text-[0.96rem] font-semibold transition-colors sm:w-auto"
        >
          Send another request
        </button>
      </div>
    </div>
  );
}
