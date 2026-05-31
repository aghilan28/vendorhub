"use client";

// KARTEX Phase N.8 — Business Value Dashboard
// Demonstration metrics expressing the platform's value in business terms.

import { cn } from "@/lib/utils";
import { getPlatformModel } from "@/lib/platform";
import { Sparkline } from "./shared";

export function BusinessValueDashboard() {
  const { valueMetrics } = getPlatformModel();

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary-text">
        Aggregate, demonstration-grade impact across the use cases and scenarios KARTEX runs end-to-end.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {valueMetrics.map((metric) => (
          <div key={metric.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-secondary-text">{metric.label}</p>
              <Sparkline values={metric.trend} />
            </div>
            <p
              className={cn(
                "mt-2 text-3xl font-semibold tracking-tight",
                metric.tone === "risk" ? "text-danger" : "text-primary-text",
              )}
            >
              {metric.value}
            </p>
            <p className="mt-2 text-xs leading-5 text-secondary-text">{metric.caption}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-secondary-text">
        Figures are illustrative demonstration metrics derived from the built-in scenarios, shown to convey the
        category and direction of value rather than audited financials.
      </p>
    </div>
  );
}
