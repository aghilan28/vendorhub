import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrustStripItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

export function TrustStrip({ items, className, label = "Visible trust indicators" }: { items: TrustStripItem[]; className?: string; label?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2 lg:grid-cols-4", className)} role="list" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon ?? ShieldCheck;
        return (
          <div key={`${item.label}-${item.value}`} className="rounded-md border border-border bg-surface px-3 py-2 shadow-sm" role="listitem">
            <p className="flex items-center gap-2 text-xs font-medium uppercase text-secondary-text">
              <Icon className="size-3.5 text-brand" aria-hidden />
              {item.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-text">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
