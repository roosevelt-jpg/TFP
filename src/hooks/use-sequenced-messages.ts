"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "motion/react";

export type SequencedMessage = {
  from: "coach" | "user";
  text: string;
  time?: string;
};

// `id` is a monotonic sequence number so React keys stay unique even when the
// same message text repeats across a loop (avoids duplicate-key warnings).
export type ShownMessage = SequencedMessage & { typing?: boolean; id: number };

const VISIBLE_WINDOW = 3;

const withId = (messages: SequencedMessage[]): ShownMessage[] =>
  messages.map((message, i) => ({ ...message, id: i }));

export function useSequencedMessages(
  messages: SequencedMessage[],
  animated: boolean,
  loop: boolean,
) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<ShownMessage[]>(
    animated ? [] : withId(messages),
  );
  // Ref (not an effect-local) so ids stay globally monotonic across effect
  // re-runs and loop restarts — no two bubbles ever share a key.
  const seq = useRef(0);

  useEffect(() => {
    if (!animated) return;
    if (reduce) {
      setShown(withId(messages).slice(-VISIBLE_WINDOW));
      return;
    }

    const scheduled: ReturnType<typeof setTimeout>[] = [];
    const nextId = () => {
      const id = seq.current;
      seq.current += 1;
      return id;
    };
    const keepLast = (a: ShownMessage[]) => a.slice(-VISIBLE_WINDOW);
    const withoutTyping = (a: ShownMessage[]) => a.filter((m) => !m.typing);

    const run = () => {
      // Start each cycle from an empty thread so a loop replays the
      // conversation fresh instead of trailing the previous cycle's messages.
      let acc = 700;
      scheduled.push(setTimeout(() => setShown([]), 0));
      for (const message of messages) {
        if (message.from === "coach") {
          scheduled.push(
            setTimeout(() => {
              setShown((s) =>
                keepLast([
                  ...withoutTyping(s),
                  { ...message, typing: true, id: nextId() },
                ]),
              );
            }, acc),
          );
          acc += 1700;
        }
        scheduled.push(
          setTimeout(() => {
            setShown((s) =>
              keepLast([...withoutTyping(s), { ...message, id: nextId() }]),
            );
          }, acc),
        );
        acc += 1800;
      }
      if (loop) scheduled.push(setTimeout(run, acc + 6000));
    };

    run();
    return () => {
      for (const t of scheduled) clearTimeout(t);
    };
  }, [messages, animated, loop, reduce]);

  return shown;
}
