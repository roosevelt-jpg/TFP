type DiaryWeek = {
  label: string;
  done: boolean;
  fade?: "muted" | "faint" | "faintest";
};

const weeks: DiaryWeek[] = [
  { label: "Week 1: every session done.", done: true },
  { label: "Week 2: only missed one.", done: true, fade: "muted" },
  { label: "Week 3: “catch up at the weekend.”", done: false, fade: "faint" },
  { label: "Week 4: restart Monday.", done: false, fade: "faintest" },
];

const fadeClass = {
  muted: "opacity-[0.78]",
  faint: "opacity-50",
  faintest: "opacity-[0.35]",
} as const;

export function ProblemDiary() {
  return (
    <div className="bg-bg border-hairline rounded-xs border p-[24px_22px]">
      <div className="border-hairline mb-4 flex items-center justify-between border-b pb-[13px]">
        <span className="text-dim text-[0.68rem] font-semibold tracking-label uppercase">
          Your last programme
        </span>
        <span aria-hidden className="text-dim text-[0.7rem]">
          8-week.pdf
        </span>
      </div>
      <ul className="grid list-none gap-[13px] p-0 text-base">
        {weeks.map((week) => (
          <li
            key={week.label}
            className={
              week.fade
                ? `flex items-center gap-[11px] ${fadeClass[week.fade]}`
                : "flex items-center gap-[11px]"
            }
          >
            <span
              aria-hidden
              className={
                week.done ? "text-muted shrink-0" : "text-dim shrink-0"
              }
            >
              {week.done ? "✓" : "○"}
            </span>
            <span
              className={
                week.done
                  ? undefined
                  : "text-dim line-through decoration-current"
              }
            >
              {week.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-display mt-[18px] text-[1.3rem] italic">
        Monday never came.
      </p>
    </div>
  );
}
