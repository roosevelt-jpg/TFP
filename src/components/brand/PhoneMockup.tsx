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
        "relative w-[min(470px,88vw)] justify-self-center",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        width={3850}
        height={2567}
        priority
        sizes="(max-width: 940px) 88vw, 470px"
        className="block h-auto w-full mask-[linear-gradient(to_bottom,#000_87%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_87%,transparent_100%)]"
      />
      <BrandChat
        animated
        loop
        messages={chat}
        header={{ avatar: "/assets/kane-headshot.png" }}
        className="shadow-card absolute bottom-[4%] left-[-12%] w-[min(248px,58vw)]"
      />
    </div>
  );
}
