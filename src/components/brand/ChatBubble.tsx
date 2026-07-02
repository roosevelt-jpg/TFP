import { cn } from "@/lib/cn";

type ChatBubbleProps = {
  from: "coach" | "user";
  children?: React.ReactNode;
  time?: string;
  typing?: boolean;
  compact?: boolean;
};

export function ChatBubble({
  from,
  children,
  time,
  typing,
  compact,
}: ChatBubbleProps) {
  const coach = from === "coach";
  return (
    <div className={cn("flex", coach ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "text-text",
          compact
            ? "max-w-[90%] rounded-[10px] px-2.5 py-[7px] text-[0.8rem] leading-[1.38]"
            : "max-w-[88%] rounded-[11px] px-3 py-[9px] text-[0.88rem] leading-[1.45]",
          coach
            ? "rounded-tl-[3px] bg-(--chat-in)"
            : "bg-surface-2 rounded-tr-[3px]",
        )}
      >
        {typing ? <TypingDots /> : children}
        {time && !typing && (
          <span className="text-dim mt-0.5 block text-right text-[0.6rem]">
            {time}
          </span>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span
      role="status"
      aria-label="Coach is typing"
      className="inline-flex gap-1 px-0.5 py-1"
    >
      {["a", "b", "c"].map((dot, i) => (
        <i
          key={dot}
          aria-hidden
          className="bg-dim size-[5px] rounded-full motion-safe:animate-[blink_1.1s_infinite]"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}
