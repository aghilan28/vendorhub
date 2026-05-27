import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-sm" role="status" aria-live="polite">
      <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
        <Icon className="size-5 text-secondary-text" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold text-primary-text">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-secondary-text">{description}</p>
      {action ? <div className="mt-5">{action}</div> : actionLabel ? <Button className="mt-5" variant="secondary">{actionLabel}</Button> : null}
    </div>
  );
}
