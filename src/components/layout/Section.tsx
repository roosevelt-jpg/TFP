import { cn } from "@/lib/cn";

import { Container } from "./Container";

type SectionProps = React.ComponentPropsWithoutRef<"section"> & {
  divided?: boolean;
  tone?: "bg" | "bg-2";
  containerWidth?: "default" | "narrow";
};

export function Section({
  divided = false,
  tone = "bg",
  containerWidth = "default",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-(--space-section)",
        tone === "bg-2" ? "bg-bg-2" : "bg-bg",
        divided && "border-hairline border-t",
        className,
      )}
      {...props}
    >
      <Container width={containerWidth}>{children}</Container>
    </section>
  );
}
