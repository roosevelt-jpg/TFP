import { cn } from "@/lib/cn";
import { whatYouGet } from "@/content/waitlist";

export function WhatYouGetCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-bg border-hairline rounded-xs border p-[22px]",
        className,
      )}
    >
      <p className="text-dim mb-[15px] text-[0.7rem] font-semibold tracking-label uppercase">
        What you get
      </p>
      <ul className="grid list-none gap-3 p-0 text-[0.95rem]">
        {whatYouGet.map((item) => (
          <li key={item} className="flex items-start gap-2.5 leading-normal">
            <span aria-hidden className="text-red shrink-0">
              ✓
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
