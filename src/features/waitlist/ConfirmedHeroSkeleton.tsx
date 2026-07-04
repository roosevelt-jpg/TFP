import { Skeleton } from "@/components/ui/skeleton";

export function ConfirmedHeroSkeleton() {
  return (
    <div
      aria-hidden
      className="relative z-1 mx-auto flex max-w-[680px] flex-col items-center text-center"
    >
      <Skeleton className="mb-[18px] h-3.5 w-52 rounded-full" />
      <Skeleton className="h-[clamp(2.6rem,7vw,4.7rem)] w-[min(100%,14ch)] rounded-sm" />
      <Skeleton className="mt-2.5 h-[clamp(2.6rem,7vw,4.7rem)] w-[min(100%,10ch)] rounded-sm" />
      <div className="mt-4 flex w-full max-w-[42ch] flex-col items-center gap-2.5">
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-3/4 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-[42px] w-[min(100%,22rem)] rounded-xs" />
    </div>
  );
}
