export function SearchSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <div className="aspect-[4/3] animate-pulse rounded-md bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="mt-4 h-9 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}
