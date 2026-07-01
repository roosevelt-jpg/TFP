"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "motion/react";

export type SequencedMessage = {
  from: "coach" | "user";
  text: string;
  time?: string;
};

type ShownMessage = SequencedMessage & { typing?: boolean };

const VISIBLE_WINDOW = 3;

export function useSequencedMessages(
  messages: SequencedMessage[],
  animated: boolean,
  loop: boolean,
) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<ShownMessage[]>(animated ? [] : messages);

  useEffect(() => {
    if (!animated) return;
    if (reduce) {
      setShown(messages.slice(-VISIBLE_WINDOW));
      return;
    }

    const scheduled: ReturnType<typeof setTimeout>[] = [];
    const keepLast = (a: ShownMessage[]) => a.slice(-VISIBLE_WINDOW);
    const withoutTyping = (a: ShownMessage[]) => a.filter((m) => !m.typing);

    const run = () => {
      let acc = 700;
      for (const message of messages) {
        if (message.from === "coach") {
          scheduled.push(
            setTimeout(() => {
              setShown((s) =>
                keepLast([...withoutTyping(s), { ...message, typing: true }]),
              );
            }, acc),
          );
          acc += 1700;
        }
        scheduled.push(
          setTimeout(() => {
            setShown((s) => keepLast([...withoutTyping(s), message]));
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
