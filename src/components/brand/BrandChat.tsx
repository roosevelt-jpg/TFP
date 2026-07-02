"use client";

import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/content/chat-scripts";
import { useSequencedMessages } from "@/hooks/use-sequenced-messages";

import { ChatBubble } from "./ChatBubble";
import { ChatHeader } from "./ChatHeader";

type ChatHeaderConfig = {
  name?: string;
  status?: string;
  online?: boolean;
  avatar?: string;
};

type BrandChatProps = {
  messages: ChatMessage[];
  header?: ChatHeaderConfig;
  animated?: boolean;
  loop?: boolean;
  translucent?: boolean;
  fixedHeight?: boolean;
  compact?: boolean;
  /** Illustrative demo — hides the looping chat from assistive tech. */
  decorative?: boolean;
  className?: string;
};

export function BrandChat({
  messages,
  header,
  animated = false,
  loop = false,
  translucent = true,
  fixedHeight = false,
  compact = false,
  decorative = false,
  className,
}: BrandChatProps) {
  const shown = useSequencedMessages(messages, animated, loop);
  return (
    <div
      aria-hidden={decorative || undefined}
      className={cn(
        "overflow-hidden rounded-md border",
        translucent
          ? "border-white/10 bg-(--chat-panel) backdrop-blur-[13px]"
          : "border-hairline bg-(--chat-solid)",
        className,
      )}
    >
      {header && <ChatHeader {...header} compact={compact} />}
      <div
        className={cn(
          "flex flex-col",
          compact ? "gap-1.5 p-[11px]" : "gap-2.5 p-[15px]",
          fixedHeight && "h-[172px] justify-end overflow-hidden",
        )}
      >
        {shown.map((m) =>
          m.typing ? (
            <ChatBubble key={m.id} from="coach" typing compact={compact} />
          ) : (
            <ChatBubble
              key={m.id}
              from={m.from}
              time={m.time}
              compact={compact}
            >
              {m.text}
            </ChatBubble>
          ),
        )}
      </div>
    </div>
  );
}
