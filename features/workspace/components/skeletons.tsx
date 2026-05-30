import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <div className="operational-surface rounded-lg p-5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-7 w-64" />
      <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-64 w-full rounded-lg" /><Skeleton className="h-64 w-full rounded-lg" /></div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}</div>
    </div>
  );
}
