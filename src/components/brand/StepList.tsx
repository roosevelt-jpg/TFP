import { cn } from "@/lib/cn";

type StepListProps = {
  children: React.ReactNode;
  className?: string;
};

export function StepList({ children, className }: StepListProps) {
  return <div className={cn("grid gap-8", className)}>{children}</div>;
}

type StepProps = {
  index: string;
  title: string;
  children: React.ReactNode;
  variant?: "editorial" | "badge";
};

export function Step({
  index,
  title,
  children,
  variant = "editorial",
}: StepProps) {
  return (
    <div>
      {variant === "badge" ? (
        <span
          aria-hidden
          // Numeral uses font-body + line-height:1 + grid-centering: the serif
          // face does not optically center in a small circle.
          className="border-hairline-strong text-muted font-body grid size-9 place-items-center rounded-full border text-[0.9rem] leading-none font-semibold"
        >
          {index}
        </span>
      ) : (
        <div className="font-display border-hairline text-dim border-b pb-4 text-[2.6rem] leading-none">
          {index}
        </div>
      )}
      <h3 className="font-display mt-4 text-[1.15rem] font-medium">{title}</h3>
      <p className="text-muted mt-2 leading-relaxed">{children}</p>
    </div>
  );
}
