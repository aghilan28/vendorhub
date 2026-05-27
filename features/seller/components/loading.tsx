import { Skeleton } from "@/components/ui/skeleton";

export function SellerDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

export function SellerTableSkeleton() {
  return (
    <div className="operational-surface space-y-3 rounded-lg p-4">
      <Skeleton className="h-9 w-72" />
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
