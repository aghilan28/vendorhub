"use client";

// KARTEX Phase N.7 — Intelligence Storyboard
// The platform as a visual story: raw signal becomes a measured outcome by
// passing through six stages.

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformModel, getSubsystem } from "@/lib/platform";
import { accent, AccentIcon } from "./shared";

export function IntelligenceStoryboard() {
  const { flow } = getPlatformModel();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-secondary-text">Raw signals enter</p>
      </div>
      {flow.map((stage) => {
        const subsystem = getSubsystem(stage.subsystemId);
        if (!subsystem) return null;
        const a = accent(subsystem.accent);
        return (
          <div key={stage.subsystemId}>
            <div className="flex justify-center">
              <ArrowDown className="size-5 text-slate-300" aria-hidden="true" />
            </div>
            <div className={cn("relative overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-sm")}>
              <span className={cn("absolute inset-y-0 left-0 w-1.5", a.dot)} />
              <div className="flex items-start gap-4 pl-2">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", a.dot)}>
                  {stage.order}
                </span>
                <AccentIcon name={subsystem.icon} theme={subsystem.accent} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary-text">{subsystem.name}</p>
                  <p className="mt-1 text-sm text-secondary-text">{subsystem.tagline}</p>
                  <p className={cn("mt-2 text-xs font-medium", a.text)}>{subsystem.value}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex justify-center">
        <ArrowDown className="size-5 text-slate-300" aria-hidden="true" />
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center shadow-sm">
        <p className="text-sm font-semibold text-emerald-800">Measured outcome delivered</p>
        <p className="mt-1 text-xs text-emerald-700">
          A closed loop: every measured outcome becomes a new signal for the next decision.
        </p>
      </div>
    </div>
  );
}
