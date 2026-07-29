import Link from "next/link";

import type { CoachingAnswers } from "@/data/payments/queries/find-coaching-profile";
import {
  DIET_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/validation/waitlist/options";

function labelOf(
  options: readonly { value: string; label: string }[],
  value: string | null,
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? value;
}

export function CoachingSummary({ answers }: { answers: CoachingAnswers }) {
  const rows: [string, string | null][] = [
    ["Goal", labelOf(GOAL_OPTIONS, answers.goal)],
    ["Experience", labelOf(LEVEL_OPTIONS, answers.level)],
    ["Sex", labelOf(SEX_OPTIONS, answers.sex)],
    ["Age", answers.age ? `${answers.age}` : null],
    ["Height", answers.heightCm ? `${answers.heightCm} cm` : null],
    ["Weight", answers.weightKg ? `${answers.weightKg} kg` : null],
    ["Goal weight", answers.goalWeightKg ? `${answers.goalWeightKg} kg` : null],
    ["Diet", labelOf(DIET_OPTIONS, answers.diet)],
  ];

  const answered = rows.filter(([, value]) => value !== null);
  const skipped = rows.length - answered.length + (answers.injuries ? 0 : 1);

  return (
    <div className="grid gap-4">
      {/* role="status" announces the swap. Focus is deliberately left alone:
          moving it on a page someone merely revisited would be worse than the
          silence it fixes. */}
      <p
        tabIndex={-1}
        role="status"
        className="text-muted leading-relaxed outline-none"
      >
        {answered.length === 0 && !answers.injuries
          ? "You skipped the questions, which is fine. Your coach will ask what they need on WhatsApp."
          : "Your coach has these and is building your first week around them."}
      </p>

      {(answered.length > 0 || answers.injuries) && (
        <dl className="border-hairline grid gap-x-6 gap-y-2.5 rounded-sm border p-4 min-[520px]:grid-cols-2">
          {answered.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="text-muted text-[0.85rem]">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}

          {/* Free text up to 300 chars, so it gets its own full-width row
              rather than being crushed right-aligned into half a column. */}
          {answers.injuries && (
            <div className="grid gap-1 min-[520px]:col-span-2">
              <dt className="text-muted text-[0.85rem]">Injuries</dt>
              <dd className="font-semibold">{answers.injuries}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="text-muted text-[0.85rem] leading-[1.6]">
        {skipped > 0 && answered.length > 0
          ? `You left ${skipped} ${skipped === 1 ? "answer" : "answers"} blank. Your coach will pick those up on WhatsApp. `
          : ""}
        Need to change something?{" "}
        <Link href="/support" className="text-text underline">
          Talk to the team
        </Link>
        .
      </p>
    </div>
  );
}
