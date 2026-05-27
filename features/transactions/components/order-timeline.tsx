import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { OrderHistoryEntry } from "@/types";

export function OrderTimeline({ history }: { history: OrderHistoryEntry[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <ol className="space-y-4" aria-label="Order timeline">
        {history.map((entry, index) => {
          const Icon = index === history.length - 1 ? Clock : index < history.length - 1 ? CheckCircle2 : Circle;
          return (
            <li key={entry.id} className="grid grid-cols-[1.25rem_1fr] gap-3">
              <Icon className="mt-0.5 size-4 text-brand" aria-hidden />
              <div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-primary-text">{entry.title}</p>
                  <time className="text-xs text-secondary-text">{new Date(entry.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                </div>
                <p className="mt-1 text-sm text-secondary-text">{entry.note}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
