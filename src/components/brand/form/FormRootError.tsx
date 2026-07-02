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
        "bg-red/10 text-red border-red/40 rounded-md border p-3 text-[0.85rem]",
        className,
      )}
    >
      {message}
    </div>
  );
}
