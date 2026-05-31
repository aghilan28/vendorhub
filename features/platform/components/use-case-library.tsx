"use client";

// KARTEX Phase N.9 — Use Case Library
// Domain-oriented entry points that launch the relevant demo scenarios.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformModel, getScenario, getSubsystem } from "@/lib/platform";
import { accent, Icon } from "./shared";

export function UseCaseLibrary() {
  const { useCases } = getPlatformModel();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {useCases.map((useCase) => (
        <article key={useCase.id} className="flex flex-col rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-brand ring-1 ring-emerald-100">
              <Icon name={useCase.icon} className="size-5" />
            </span>
            <h3 className="text-base font-semibold text-primary-text">{useCase.name}</h3>
          </div>
          <p className="mt-3 text-sm font-medium text-primary-text">{useCase.headline}</p>
          <p className="mt-1 text-sm text-secondary-text">{useCase.description}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {useCase.primarySubsystems.map((id) => {
              const subsystem = getSubsystem(id);
              if (!subsystem) return null;
              return (
                <span key={id} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", accent(subsystem.accent).chip)}>
                  {subsystem.name}
                </span>
              );
            })}
          </div>

          <div className="mt-4 flex flex-1 flex-col justify-end gap-1.5 border-t border-border pt-3">
            {useCase.scenarioIds.map((scenarioId) => {
              const scenario = getScenario(scenarioId);
              if (!scenario) return null;
              return (
                <Link
                  key={scenarioId}
                  href={`/showcase?scenario=${scenarioId}`}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-primary-text transition hover:bg-slate-50 focus-ring"
                >
                  <span>Launch: {scenario.title}</span>
                  <ArrowRight className="size-4 text-brand" />
                </Link>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
