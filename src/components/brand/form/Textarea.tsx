import { cn } from "@/lib/cn";

export function Textarea({
  className,
  ...props
}: React.ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "bg-bg-2 border-hairline-strong text-text placeholder:text-dim min-h-[130px] w-full resize-y rounded-xs border p-3.5 text-base leading-[1.4] outline-none",
        "transition-[border-color,box-shadow] focus-visible:border-red focus-visible:shadow-[0_0_0_3px_var(--ring)]",
        "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--danger)_38%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
