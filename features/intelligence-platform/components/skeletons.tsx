import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="operational-surface rounded-lg p-5">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="mt-3 h-7 w-72" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}</div>
    </div>
  );
}
