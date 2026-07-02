import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  as?: "h1" | "h2";
  children: React.ReactNode;
  size?: "display" | "h2";
  align?: "start" | "center";
  maxChars?: number;
  className?: string;
};

export function SectionHeading({
  as: Tag = "h2",
  children,
  size = "h2",
  align = "start",
  maxChars,
  className,
}: SectionHeadingProps) {
  return (
    <Tag
      className={cn(
        size === "display" ? "text-display" : "text-h2",
        align === "center" && "text-center",
        className,
      )}
      style={maxChars ? { maxWidth: `${maxChars}ch` } : undefined}
    >
      {children}
    </Tag>
  );
}
