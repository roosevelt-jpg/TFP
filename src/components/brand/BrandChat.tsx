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
  className?: string;
};

export function BrandChat({
  messages,
  header,
  animated = false,
  loop = false,
  translucent = true,
  className,
}: BrandChatProps) {
  const shown = useSequencedMessages(messages, animated, loop);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border",
        translucent
          ? "border-white/10 bg-(--chat-panel) backdrop-blur-[13px]"
          : "border-hairline bg-(--chat-solid)",
        className,
      )}
    >
      {header && <ChatHeader {...header} />}
      <div className="flex flex-col gap-2 p-[13px]">
        {shown.map((m) =>
          m.typing ? (
            <ChatBubble key="typing" from="coach" typing />
          ) : (
            <ChatBubble key={`${m.from}-${m.text}`} from={m.from} time={m.time}>
              {m.text}
            </ChatBubble>
          ),
        )}
      </div>
    </div>
  );
}
