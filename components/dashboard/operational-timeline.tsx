import { TimelineItem } from "@/components/commerce/timeline-item";

export function OperationalTimeline({ items }: { items: { title: string; description: string; time: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TimelineItem key={`${item.title}-${item.time}`} {...item} />
      ))}
    </div>
  );
}
