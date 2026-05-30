"use client";

// KARTEX Phase N.4 — Demo Scenario Center
// Prebuilt scenarios that each demonstrate Research → Knowledge → Simulation →
// SECIS → Governance → Execution end-to-end.

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformModel, getScenario, getSubsystem } from "@/lib/platform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { accent, AccentIcon } from "./shared";

const severityTone: Record<string, "default" | "secondary" | "warning" | "danger"> = {
  low: "default",
  moderate: "secondary",
  high: "warning",
  critical: "danger",
};

export function DemoScenarioCenter() {
  const { scenarios } = getPlatformModel();
  const [activeId, setActiveId] = useState<string>(scenarios[0]?.id ?? "");
  const active = getScenario(activeId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-2">
        {scenarios.map((scenario) => {
          const selected = scenario.id === activeId;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => setActiveId(scenario.id)}
              aria-pressed={selected}
              className={cn(
                "w-full rounded-lg border p-3 text-left transition focus-ring",
                selected ? "border-brand bg-emerald-50/60" : "border-border bg-surface hover:bg-slate-50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-primary-text">{scenario.title}</span>
                <Badge variant={severityTone[scenario.severity]}>{scenario.severity}</Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-secondary-text">{scenario.trigger}</p>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-primary-text">{active.title}</h3>
              <p className="mt-1 max-w-2xl text-sm text-secondary-text">{active.summary}</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/showcase?scenario=${active.id}`}>
                <Play className="size-4" /> Run in Showcase
              </Link>
            </Button>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <span className="font-semibold">Trigger:</span> {active.trigger}
          </div>

          <ol className="space-y-2">
            {active.stages.map((stage, index) => {
              const subsystem = getSubsystem(stage.subsystemId);
              if (!subsystem) return null;
              const a = accent(subsystem.accent);
              return (
                <li key={stage.subsystemId} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold text-white", a.dot)}>
                      {index + 1}
                    </span>
                    <AccentIcon name={subsystem.icon} theme={subsystem.accent} className="size-8" />
                    <span className="text-sm font-semibold text-primary-text">{subsystem.name}</span>
                  </div>
                  <div className="mt-2 grid gap-1 pl-9 sm:grid-cols-2">
                    <p className="text-sm text-secondary-text">{stage.action}</p>
                    <p className={cn("text-sm font-medium", a.text)}>→ {stage.output}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap gap-3">
            {active.impact.map((impact) => (
              <div
                key={impact.label}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  impact.tone === "positive"
                    ? "border-emerald-200 bg-emerald-50"
                    : impact.tone === "risk"
                      ? "border-red-200 bg-red-50"
                      : "border-border bg-slate-50",
                )}
              >
                <p className="text-lg font-semibold text-primary-text">{impact.value}</p>
                <p className="text-xs text-secondary-text">{impact.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
            <ArrowRight className="mt-0.5 size-4 text-brand" />
            <p className="text-sm text-primary-text">
              <span className="font-semibold">Outcome:</span> {active.outcome}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
