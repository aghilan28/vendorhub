import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GovernanceMetric } from "../types";

const toneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

export function GovernanceMetricCard({ metric }: { metric: GovernanceMetric }) {
  const Icon = metric.icon;
  const StateIcon = metric.tone === "success" ? CheckCircle2 : metric.tone === "info" || metric.tone === "neutral" ? Info : AlertTriangle;

  return (
    <div className="operational-surface rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-secondary-text">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-primary-text">{metric.value}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-slate-100 text-secondary-text">
          <Icon className="size-4" />
        </div>
      </div>
      <div className={cn("mt-4 flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs font-medium", toneClasses[metric.tone])}>
        <StateIcon className="size-3.5" />
        <span>{metric.helper}</span>
      </div>
    </div>
  );
}
