import Image from "next/image";

import { cn } from "@/lib/cn";

type ChatHeaderProps = {
  name?: string;
  status?: string;
  online?: boolean;
  avatar?: string;
};

export function ChatHeader({
  name = "Kane · Your Coach",
  status = "online",
  online = true,
  avatar,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-[9px] bg-(--chat-header) px-[13px] py-[11px]">
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          aria-hidden
          width={30}
          height={30}
          className="size-[30px] rounded-full object-cover object-[50%_8%]"
        />
      ) : (
        <span
          aria-hidden
          className="bg-red grid size-[30px] place-items-center rounded-full font-semibold text-white"
        >
          K
        </span>
      )}
      <div className="leading-tight">
        <div className="text-text text-[0.82rem] font-semibold">{name}</div>
        <div
          className={cn(
            "flex items-center gap-[5px] text-[0.62rem]",
            online ? "text-good" : "text-dim",
          )}
        >
          {online && (
            <span aria-hidden className="bg-good size-1.5 rounded-full" />
          )}
          {status}
        </div>
      </div>
    </div>
  );
}
