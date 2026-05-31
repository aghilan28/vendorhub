"use client";

// KARTEX Phase N.5 — Showcase Mode (/showcase)
// Presentation-ready, minimal, full-screen, story-driven flow. A scenario is
// walked beat-by-beat: intro → six intelligence stages → measured outcome.
// Investor-, faculty- and competition-ready.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getPlatformModel, getScenario, getSubsystem, type DemoScenario } from "@/lib/platform";
import { accent, Icon } from "./shared";

type Beat =
  | { kind: "intro"; scenario: DemoScenario }
  | { kind: "stage"; scenario: DemoScenario; stageIndex: number }
  | { kind: "outcome"; scenario: DemoScenario };

function buildBeats(scenario: DemoScenario): Beat[] {
  return [
    { kind: "intro", scenario },
    ...scenario.stages.map((_, stageIndex) => ({ kind: "stage" as const, scenario, stageIndex })),
    { kind: "outcome", scenario },
  ];
}

export function ShowcaseMode({ initialScenarioId }: { initialScenarioId?: string }) {
  const { scenarios } = getPlatformModel();
  const fallback = scenarios[0]?.id ?? "";
  const [scenarioId, setScenarioId] = useState<string>(
    initialScenarioId && getScenario(initialScenarioId) ? initialScenarioId : fallback,
  );
  const [beatIndex, setBeatIndex] = useState(0);

  const scenario = getScenario(scenarioId) ?? scenarios[0];
  const beats = useMemo(() => (scenario ? buildBeats(scenario) : []), [scenario]);
  const beat = beats[beatIndex];

  if (!scenario || !beat) return null;

  const total = beats.length;
  const isFirst = beatIndex === 0;
  const isLast = beatIndex === total - 1;

  const selectScenario = (id: string) => {
    setScenarioId(id);
    setBeatIndex(0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Minimal top bar */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/platform" className="inline-flex items-center gap-2 font-semibold text-primary-text focus-ring">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand text-white">
            <Compass className="size-4" />
          </span>
          KARTEX Showcase
        </Link>
        <div className="flex items-center gap-2">
          <Select value={scenarioId} onValueChange={selectScenario}>
            <SelectTrigger className="w-52" aria-label="Choose scenario">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="ghost" size="sm">
            <Link href="/platform">Exit</Link>
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="flex items-center gap-1.5 px-4 py-3 sm:px-6" aria-hidden="true">
        {beats.map((_, index) => (
          <span
            key={index}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", index <= beatIndex ? "bg-brand" : "bg-slate-200")}
          />
        ))}
      </div>

      {/* Stage */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl">
          <BeatView beat={beat} />
        </div>
      </main>

      {/* Controls */}
      <footer className="flex items-center justify-between gap-3 border-t border-border bg-surface/80 px-4 py-4 backdrop-blur sm:px-6">
        <Button variant="secondary" onClick={() => setBeatIndex((i) => Math.max(0, i - 1))} disabled={isFirst}>
          <ArrowLeft className="size-4" /> Previous
        </Button>
        <p className="text-xs text-secondary-text">
          Beat {beatIndex + 1} of {total} · {scenario.title}
        </p>
        {isLast ? (
          <Button onClick={() => setBeatIndex(0)}>
            <Play className="size-4" /> Replay
          </Button>
        ) : (
          <Button onClick={() => setBeatIndex((i) => Math.min(total - 1, i + 1))}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </footer>
    </div>
  );
}

function BeatView({ beat }: { beat: Beat }) {
  if (beat.kind === "intro") {
    const { scenario } = beat;
    return (
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">Demo scenario</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-primary-text sm:text-5xl">{scenario.title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-secondary-text">{scenario.summary}</p>
        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">The trigger</p>
          <p className="mt-1 text-sm text-amber-900">{scenario.trigger}</p>
        </div>
        <p className="mt-6 text-sm text-secondary-text">Watch it flow through all six stages →</p>
      </div>
    );
  }

  if (beat.kind === "outcome") {
    const { scenario } = beat;
    return (
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">Measured outcome</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-primary-text sm:text-4xl">{scenario.outcome}</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {scenario.impact.map((impact) => (
            <div
              key={impact.label}
              className={cn(
                "min-w-36 rounded-xl border p-5",
                impact.tone === "positive"
                  ? "border-emerald-200 bg-emerald-50"
                  : impact.tone === "risk"
                    ? "border-red-200 bg-red-50"
                    : "border-border bg-slate-50",
              )}
            >
              <p className="text-3xl font-semibold text-primary-text">{impact.value}</p>
              <p className="mt-1 text-sm text-secondary-text">{impact.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-secondary-text">
          The loop closes — this outcome becomes a new signal for the next decision.
        </p>
      </div>
    );
  }

  // stage
  const { scenario, stageIndex } = beat;
  const stage = scenario.stages[stageIndex];
  const subsystem = getSubsystem(stage.subsystemId);
  if (!subsystem) return null;
  const a = accent(subsystem.accent);

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        {scenario.stages.map((s, index) => {
          const dotSub = getSubsystem(s.subsystemId);
          return (
            <span
              key={s.subsystemId}
              className={cn(
                "size-2.5 rounded-full",
                index === stageIndex ? (dotSub ? accent(dotSub.accent).dot : "bg-brand") : "bg-slate-200",
              )}
            />
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <span className={cn("flex size-20 items-center justify-center rounded-2xl text-white", a.dot)}>
          <Icon name={subsystem.icon} className="size-9" />
        </span>
        <p className={cn("mt-4 text-xs font-semibold uppercase tracking-widest", a.text)}>
          Stage {stageIndex + 1} · {subsystem.phase}
        </p>
        <h2 className="mt-1 text-3xl font-semibold tracking-tight text-primary-text">{subsystem.name}</h2>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">What it does here</p>
          <p className="mt-2 text-base leading-7 text-primary-text">{stage.action}</p>
        </div>
        <div className={cn("rounded-xl border p-5 shadow-sm", a.soft, a.ring, "ring-1")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">What it produces</p>
          <p className="mt-2 text-base font-medium leading-7 text-primary-text">{stage.output}</p>
        </div>
      </div>
    </div>
  );
}
