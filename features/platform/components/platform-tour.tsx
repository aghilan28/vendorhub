"use client";

// KARTEX Phase N.3 — Platform Tour
// Launch guided, interactive walkthroughs: one per subsystem plus a complete
// platform tour. Each tour is a stepper with previous/next navigation.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, ExternalLink, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPlatformModel, getSubsystem } from "@/lib/platform";
import { accent, AccentIcon } from "./shared";

export function PlatformTour() {
  const { tours } = getPlatformModel();
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const activeTour = tours.find((tour) => tour.id === activeTourId) ?? null;

  const launch = (id: string) => {
    setActiveTourId(id);
    setStep(0);
  };
  const close = () => setActiveTourId(null);

  if (activeTour) {
    const current = activeTour.steps[step];
    const subsystem = current.subsystemId ? getSubsystem(current.subsystemId) : null;
    const a = subsystem ? accent(subsystem.accent) : null;
    const isLast = step === activeTour.steps.length - 1;

    return (
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="text-xs font-medium text-secondary-text">Guided tour</p>
            <h3 className="text-base font-semibold text-primary-text">{activeTour.title}</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={close} aria-label="Close tour">
            <X className="size-4" /> Exit
          </Button>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center gap-1.5" aria-hidden="true">
            {activeTour.steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index <= step ? "bg-brand" : "bg-slate-200",
                )}
              />
            ))}
          </div>

          <div className="flex items-start gap-4">
            {subsystem ? (
              <AccentIcon name={subsystem.icon} theme={subsystem.accent} className="size-12" />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-lg bg-emerald-50 text-brand ring-1 ring-emerald-100">
                <Play className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-secondary-text">
                Step {step + 1} of {activeTour.steps.length}
              </p>
              <h4 className="mt-1 text-lg font-semibold text-primary-text">{current.title}</h4>
              <p className="mt-2 text-sm leading-6 text-secondary-text">{current.body}</p>
              {current.route ? (
                <Link
                  href={current.route}
                  className={cn("mt-3 inline-flex items-center gap-1 text-sm font-medium focus-ring", a?.text ?? "text-brand")}
                >
                  Open this in the app <ExternalLink className="size-3.5" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            {isLast ? (
              <Button size="sm" onClick={close}>
                Finish tour
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => Math.min(activeTour.steps.length - 1, s + 1))}>
                Next <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-secondary-text">
        Launch a focused tour of any subsystem, or take the complete platform tour to understand KARTEX end-to-end.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tours.map((tour) => {
          const highlight = tour.id === "tour-complete";
          return (
            <button
              key={tour.id}
              type="button"
              onClick={() => launch(tour.id)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition focus-ring",
                highlight ? "border-brand bg-emerald-50/60" : "border-border bg-surface hover:bg-slate-50",
              )}
            >
              <div>
                <p className="text-sm font-semibold text-primary-text">{tour.title}</p>
                <p className="mt-1 text-xs text-secondary-text">{tour.audience}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-secondary-text">
                  <Clock className="size-3" /> ~{tour.durationMinutes} min · {tour.steps.length} steps
                </p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Play className="size-4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
