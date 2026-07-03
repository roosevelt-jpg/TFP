import { cn } from "@/lib/cn";

export function Input({
  className,
  ...props
}: React.ComponentPropsWithRef<"input">) {
  return (
    <input
      className={cn(
        "bg-bg-2 border-hairline-strong text-text placeholder:text-dim w-full rounded-xs border p-3.5 text-base leading-[1.3] outline-none",
        "transition-[border-color,box-shadow] focus-visible:border-red focus-visible:shadow-[0_0_0_3px_var(--ring)]",
        "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--danger)_38%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
