import Image from "next/image";

import { cn } from "@/lib/cn";

type ChatHeaderProps = {
  name?: string;
  status?: string;
  online?: boolean;
  avatar?: string;
  compact?: boolean;
};

export function ChatHeader({
  name = "Kane · Your Coach",
  status = "online",
  online = true,
  avatar,
  compact = false,
}: ChatHeaderProps) {
  const avatarSize = compact ? 27 : 34;
  return (
    <div
      className={cn(
        "flex items-center bg-(--chat-header)",
        compact
          ? "gap-[9px] px-[11px] py-[9px]"
          : "gap-2.5 px-[15px] py-[13px]",
      )}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          aria-hidden
          width={avatarSize}
          height={avatarSize}
          style={{ width: avatarSize, height: avatarSize }}
          className="rounded-full object-cover object-[50%_8%]"
        />
      ) : (
        <span
          aria-hidden
          style={{ width: avatarSize, height: avatarSize }}
          className="bg-red text-cta-contrast grid place-items-center rounded-full font-semibold"
        >
          K
        </span>
      )}
      <div className="leading-tight">
        <div
          className={cn(
            "text-text font-semibold",
            compact ? "text-[0.79rem]" : "text-[0.86rem]",
          )}
        >
          {name}
        </div>
        <div
          className={cn(
            "flex items-center gap-[5px]",
            compact ? "text-[0.61rem]" : "text-[0.66rem]",
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
