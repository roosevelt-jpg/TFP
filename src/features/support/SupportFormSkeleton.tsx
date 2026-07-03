import { Skeleton } from "@/components/ui/skeleton";

function FieldSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="h-[52px] w-full rounded-xs" />
    </div>
  );
}

export function SupportFormSkeleton() {
  return (
    <div className="bg-bg border-hairline shadow-card mt-[30px] grid gap-[18px] rounded-md border p-[clamp(22px,4vw,32px)]">
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <div className="grid gap-2">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-[130px] w-full rounded-xs" />
      </div>
      <Skeleton className="h-[52px] w-full rounded-xs" />
    </div>
  );
}
