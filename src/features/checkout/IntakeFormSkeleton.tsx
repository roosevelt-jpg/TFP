import { Skeleton } from "@/components/ui/skeleton";

function FieldSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-12 w-full rounded-xs" />
    </div>
  );
}

export function IntakeFormSkeleton() {
  return (
    <div aria-hidden className="grid gap-5">
      <FieldSkeleton />
      <FieldSkeleton />
      <FieldSkeleton />
      <Skeleton className="h-12 w-full rounded-xs" />
      <Skeleton className="h-16 w-full rounded-xs" />
      <Skeleton className="h-14 w-full rounded-xs" />
    </div>
  );
}
