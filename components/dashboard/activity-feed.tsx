import { Clock } from "lucide-react";

export function ActivityFeed({ items }: { items: { title: string; meta: string }[] }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <div className="flex gap-3 p-4" key={`${item.title}-${item.meta}`}>
          <Clock className="mt-0.5 size-4 text-secondary-text" />
          <div>
            <p className="text-sm font-medium text-primary-text">{item.title}</p>
            <p className="text-xs text-secondary-text">{item.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
