import { cn } from "@/lib/cn";

type EyebrowProps = {
  children: React.ReactNode;
  align?: "start" | "center";
  as?: "div" | "span";
  className?: string;
};

export function Eyebrow({
  children,
  align = "start",
  as: Tag = "div",
  className,
}: EyebrowProps) {
  return (
    <Tag
      className={cn(
        "text-eyebrow text-dim tracking-label inline-flex items-center gap-[9px] font-semibold uppercase",
        align === "center" && "justify-center",
        className,
      )}
    >
      <span aria-hidden className="bg-red size-1.5 shrink-0" />
      {children}
    </Tag>
  );
}
