"use client";

import { useRouter } from "next/navigation";
import { FlaskConical, Plus, Variable } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { allTemplates, useSimulationStore } from "@/store/simulation-store";
import { useHydrated } from "../hooks";
import { SimShell, SimCard } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function TemplatesScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const customTemplates = useSimulationStore((s) => s.customTemplates);

  if (!hydrated) return <ListSkeleton />;

  const templates = allTemplates(customTemplates);
  const builtIn = templates.filter((t) => t.builtIn);
  const custom = templates.filter((t) => !t.builtIn);

  function renderCard(t: (typeof templates)[number]) {
    return (
      <div key={t.id} className="operational-surface flex flex-col rounded-lg p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand">
            <FlaskConical className="size-4" />
          </span>
          <Badge variant={t.builtIn ? "secondary" : "ai"}>{t.builtIn ? "Built-in" : "Custom"}</Badge>
        </div>
        <p className="mt-3 font-medium text-primary-text">{t.name}</p>
        <p className="mt-1 line-clamp-2 text-xs text-secondary-text">{t.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="secondary">{t.category}</Badge>
          {t.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{tag}</span>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1 text-xs text-secondary-text">
          <Variable className="size-3" /> {t.parameters.length} parameters · {t.variables.length} output variables
        </p>
        <div className="mt-auto pt-3">
          <Button size="sm" className="w-full" onClick={() => router.push(`/simulations/scenarios?template=${t.id}`)}>
            <Plus className="size-4" /> Use template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SimShell
      title="Simulation Templates"
      description="Reusable model blueprints. Pick a template to scaffold a scenario with sensible defaults, then tune it in the builder."
    >
      <SimCard title="Built-in models" description="Production-ready, deterministic commerce models.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{builtIn.map(renderCard)}</div>
      </SimCard>

      <SimCard title="Your templates" description="Templates you saved from existing scenarios.">
        {custom.length === 0 ? (
          <p className="text-sm text-secondary-text">No custom templates yet. Save any scenario as a template from the Scenario Builder.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{custom.map(renderCard)}</div>
        )}
      </SimCard>
    </SimShell>
  );
}
