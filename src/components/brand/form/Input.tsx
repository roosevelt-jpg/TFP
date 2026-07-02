import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: React.ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(
        "bg-bg border-hairline-strong text-text placeholder:text-dim h-11 w-full rounded-sm border px-3.5 text-[0.95rem] outline-none",
        "focus-visible:border-dim focus-visible:ring-2 focus-visible:ring-ring",
        "aria-invalid:border-red",
        className,
      )}
      {...props}
    />
  );
}
