import { Skeleton } from "@/components/ui/skeleton";

// The bars are decorative, but the wait itself must be announced — otherwise a
// screen-reader user gets silence between arriving and the confirmation
// resolving.
export function ConfirmingSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Confirming your payment…</span>
      <div
        aria-hidden
        className="mx-auto grid max-w-170 justify-items-center gap-4"
      >
        <Skeleton className="h-3.5 w-[min(100%,12ch)] rounded-full" />
        <Skeleton className="h-[clamp(2.6rem,7vw,4.7rem)] w-[min(100%,10ch)] rounded-sm" />
        <Skeleton className="h-4 w-[min(100%,34ch)] rounded-full" />
        <Skeleton className="h-4 w-[min(100%,28ch)] rounded-full" />
      </div>
    </div>
  );
}
