import { cn } from "@/lib/cn";

import { Container } from "./Container";

type SectionProps = React.ComponentPropsWithoutRef<"section"> & {
  divided?: boolean;
  containerWidth?: "default" | "narrow";
};

export function Section({
  divided = false,
  containerWidth = "default",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      // Transparent (relative for content stacking) so the fixed cursor
      // SpotlightGrid shows through every section; opaque cards mask it locally.
      className={cn(
        "relative py-(--space-section)",
        divided && "border-hairline border-t",
        className,
      )}
      {...props}
    >
      <Container width={containerWidth}>{children}</Container>
    </section>
  );
}
