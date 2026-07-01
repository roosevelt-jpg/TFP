import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const cta = cva(
  "group relative inline-flex touch-manipulation items-center justify-center gap-2 overflow-hidden font-medium select-none rounded-sm transition-[transform,filter,background-color,border-color] duration-200 ease-emphasis focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--ring)] hover:-translate-y-0.5 active:translate-y-0 disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-red text-cta-contrast hover:brightness-108",
        ghost:
          "border-hairline-strong text-text hover:border-dim hover:bg-surface border",
        invert: "bg-text text-bg hover:brightness-95",
      },
      size: {
        sm: "px-[18px] py-2.5 text-sm",
        md: "px-7 py-4 text-[1.02rem]",
        lg: "px-8 py-[18px] text-[1.1rem]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

type CtaButtonProps = React.ComponentPropsWithoutRef<"a"> &
  VariantProps<typeof cta> & {
    withArrow?: boolean;
    withShine?: boolean;
  };

export function CtaButton({
  variant,
  size,
  block,
  withArrow = true,
  withShine = true,
  className,
  children,
  ...props
}: CtaButtonProps) {
  return (
    <a className={cn(cta({ variant, size, block }), className)} {...props}>
      {children}
      {withArrow && (
        <span
          aria-hidden
          className="ease-emphasis inline-block transition-transform duration-300 group-hover:translate-x-[5px]"
        >
          →
        </span>
      )}
      {withShine && (
        <span
          aria-hidden
          className="ease-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[200%] bg-[linear-gradient(105deg,transparent,rgba(255,255,255,.3),transparent)] transition-transform duration-[850ms] group-hover:translate-x-[360%]"
        />
      )}
    </a>
  );
}
