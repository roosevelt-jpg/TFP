import Image from "next/image";

import { cn } from "@/lib/cn";
import type { ChatMessage } from "@/content/chat-scripts";

import { BrandChat } from "./BrandChat";

type PhoneMockupProps = {
  image: { src: string; alt: string };
  chat: ChatMessage[];
  className?: string;
};

export function PhoneMockup({ image, chat, className }: PhoneMockupProps) {
  return (
    <div
      className={cn(
        "relative flex w-[min(390px,86vw)] flex-col items-center justify-self-center min-[940px]:block min-[940px]:w-[min(500px,90vw)]",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={2272}
        height={2542}
        preload
        sizes="(max-width: 940px) min(390px, 86vw), min(500px, 90vw)"
        className="block h-auto w-full filter-[contrast(1.03)_drop-shadow(0_20px_44px_rgba(0,0,0,0.6))] mask-[linear-gradient(to_bottom,#000_87%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_87%,transparent_100%)]"
      />
      <BrandChat
        animated
        loop
        fixedHeight
        compact
        decorative
        messages={chat}
        header={{
          name: "Kane · Your Coach",
          status: "online",
          online: true,
          avatar: "/assets/kane-headshot.png",
        }}
        className="shadow-card static mt-[-6%] w-[min(300px,100%)] max-w-[300px] min-[940px]:absolute min-[940px]:bottom-[4%] min-[940px]:left-[-12%] min-[940px]:mt-0 min-[940px]:w-[min(248px,58vw)] min-[940px]:max-w-none"
      />
    </div>
  );
}
