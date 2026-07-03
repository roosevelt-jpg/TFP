import { Skeleton } from "@/components/ui/skeleton";

export function ConfirmedHeroSkeleton() {
  return (
    <div className="relative z-1 mx-auto flex max-w-[680px] flex-col items-center text-center">
      <Skeleton className="mb-[18px] h-3.5 w-40 rounded-full" />
      <Skeleton className="h-[clamp(2.6rem,7vw,4.7rem)] w-[min(100%,15ch)] rounded-sm" />
      <Skeleton className="mt-3 h-[clamp(2.6rem,7vw,4.7rem)] w-[min(100%,11ch)] rounded-sm" />
      <div className="mt-6 flex w-full max-w-[42ch] flex-col items-center gap-2.5">
        <Skeleton className="h-3.5 w-full rounded-full" />
        <Skeleton className="h-3.5 w-4/5 rounded-full" />
      </div>
      <Skeleton className="mt-5 h-10 w-[min(100%,20rem)] rounded-xs" />
    </div>
  );
}
