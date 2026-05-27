import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton className="mb-3 h-10 last:mb-0" key={index} />
      ))}
    </div>
  );
}
