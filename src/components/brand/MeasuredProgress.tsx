import { Eyebrow } from "./Eyebrow";

type MeasuredProgressProps = {
  benchmarks: string[];
};

export function MeasuredProgress({ benchmarks }: MeasuredProgressProps) {
  return (
    <div className="border-hairline mt-[clamp(46px,6vw,70px)] border-t pt-[clamp(30px,4vw,44px)] text-center">
      <Eyebrow align="center" className="mb-3.5">
        Measured progress
      </Eyebrow>
      <p className="font-display mx-auto max-w-[22ch] text-[clamp(1.5rem,3.4vw,2.1rem)] leading-[1.1]">
        Four benchmarks. <em>Proof you can see.</em>
      </p>
      <p className="text-muted mx-auto mt-3.5 mb-[26px] max-w-[52ch] leading-[1.6]">
        We test four benchmarks in week one and re-test them in week eight, so
        your progress is measured from your own starting point, never guessed.
      </p>
      <div className="mb-6.5 flex flex-wrap justify-center gap-2.5">
        {benchmarks.map((benchmark) => (
          <span
            key={benchmark}
            className="bg-bg border-hairline-strong rounded-full border px-4 py-[9px] text-[0.82rem]"
          >
            {benchmark}
          </span>
        ))}
      </div>
      <div className="text-dim mx-auto flex max-w-105 items-center justify-center gap-3.5 text-[0.7rem] font-semibold tracking-[0.14em] uppercase">
        <span>Week 01 · Baseline</span>
        <span aria-hidden className="bg-hairline-strong h-px w-8" />
        <span>Week 08 · Re-test</span>
      </div>
    </div>
  );
}
