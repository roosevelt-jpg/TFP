import { cn } from "@/lib/cn";

type ContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  width?: "default" | "narrow";
};

export function Container({
  width = "default",
  className,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-(--gutter)",
        width === "narrow" ? "max-w-(--maxw-narrow)" : "max-w-(--maxw)",
        className,
      )}
      {...props}
    />
  );
}
