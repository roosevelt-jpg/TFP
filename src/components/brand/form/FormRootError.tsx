import { cn } from "@/lib/cn";

type FormRootErrorProps = {
  message?: string;
  className?: string;
};

export function FormRootError({ message, className }: FormRootErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "bg-danger/10 text-danger border-danger/40 rounded-xs border p-3 text-[0.85rem]",
        className,
      )}
    >
      {message}
    </div>
  );
}
