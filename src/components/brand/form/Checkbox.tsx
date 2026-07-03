import { cn } from "@/lib/cn";

type CheckboxProps = React.ComponentPropsWithRef<"input"> & {
  label: React.ReactNode;
};

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "border-hairline-strong accent-red mt-0.5 size-[18px] shrink-0 rounded-xs border",
          "outline-none focus-visible:shadow-[0_0_0_3px_var(--ring)]",
          className,
        )}
        {...props}
      />
      <span className="text-muted text-[0.85rem] leading-normal">{label}</span>
    </label>
  );
}
