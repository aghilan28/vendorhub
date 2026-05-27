export function TimelineItem({ title, description, time }: { title: string; description: string; time: string }) {
  return (
    <div className="relative pl-6">
      <span className="absolute left-0 top-1.5 size-2 rounded-full bg-brand" />
      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-primary-text">{title}</p>
          <time className="shrink-0 text-xs text-secondary-text">{time}</time>
        </div>
        <p className="mt-1 text-sm text-secondary-text">{description}</p>
      </div>
    </div>
  );
}
