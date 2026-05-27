import type { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/formatting/currency";

export function FinanceMetricCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-secondary-text">
        <Icon className="size-4 text-brand" />
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold text-primary-text">{typeof value === "number" ? formatCurrency(value) : value}</p>
      <p className="mt-1 text-xs text-secondary-text">{helper}</p>
    </div>
  );
}
