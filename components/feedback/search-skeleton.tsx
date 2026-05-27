export function SearchSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="p-2 pb-0">
            <div className="aspect-square animate-pulse rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
          </div>
          <div className="space-y-3 p-3">
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-11 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
