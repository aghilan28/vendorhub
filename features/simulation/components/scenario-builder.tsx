"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Copy, Play, Plus, Save, Trash2, Archive, X, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SimulationLineChart } from "@/components/charts/simulation-line-chart";
import {
  defaultParameters,
  runSimulationModel,
  type ConstraintOperator,
  type ModelKey,
  type SimulationAssumption,
  type SimulationConstraint,
} from "@/lib/simulation";
import { allTemplates, useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { ListSkeleton } from "./skeletons";
import { SimShell, SimCard } from "./primitives";
import { ParameterControls } from "./parameter-controls";

const CURRENCY_MODELS: ModelKey[] = ["revenue_projection", "pricing_sensitivity"];
function compact(v: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

interface FormAssumption extends Pick<SimulationAssumption, "statement" | "confidence" | "rationale"> {
  id: string;
}
interface FormConstraint extends Omit<SimulationConstraint, "id"> {
  id: string;
}

function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function ScenarioForm({ scenarioId, onDone }: { scenarioId?: string; onDone: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const customTemplates = useSimulationStore((s) => s.customTemplates);
  const templates = useMemo(() => allTemplates(customTemplates), [customTemplates]);
  const existing = useSimulationStore((s) => s.scenarios.find((x) => x.id === scenarioId));
  const settings = useSimulationStore((s) => s.settings);
  const createScenario = useSimulationStore((s) => s.createScenario);
  const updateScenario = useSimulationStore((s) => s.updateScenario);
  const startRun = useSimulationStore((s) => s.startRun);
  const canEdit = usePermission("simulation.edit");
  const canRun = usePermission("scenario.run");

  const initialTemplateId = existing?.templateId ?? params.get("template") ?? templates[0].id;
  const attachSimId = params.get("sim") ?? undefined;

  const [templateId, setTemplateId] = useState(initialTemplateId);
  const template = templates.find((t) => t.id === templateId) ?? templates[0];

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? template.category);
  const [tags, setTags] = useState((existing?.tags ?? template.tags).join(", "));
  const [seed, setSeed] = useState(existing?.seed ?? settings.defaultSeed);
  const [parameters, setParameters] = useState<Record<string, number | string>>(
    existing?.parameters ?? defaultParameters(template),
  );
  const [assumptions, setAssumptions] = useState<FormAssumption[]>(
    existing?.assumptions.map((a) => ({ id: a.id, statement: a.statement, confidence: a.confidence, rationale: a.rationale })) ??
      template.defaultAssumptions.map((statement) => ({ id: localId("asm"), statement, confidence: "medium" as const })),
  );
  const [constraints, setConstraints] = useState<FormConstraint[]>(
    existing?.constraints.map((c) => ({ id: c.id, label: c.label, metric: c.metric, operator: c.operator, threshold: c.threshold })) ??
      template.defaultConstraints.map((c) => ({ id: localId("con"), ...c })),
  );
  const [newAssumption, setNewAssumption] = useState("");
  const [newAssumptionConfidence, setNewAssumptionConfidence] = useState<"low" | "medium" | "high">("medium");

  function applyTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setParameters(defaultParameters(t));
    setCategory(t.category);
    setTags(t.tags.join(", "));
    setAssumptions(t.defaultAssumptions.map((statement) => ({ id: localId("asm"), statement, confidence: "medium" })));
    setConstraints(t.defaultConstraints.map((c) => ({ id: localId("con"), ...c })));
  }

  const preview = useMemo(
    () => runSimulationModel(template.modelKey, parameters, seed, constraints.map((c) => ({ ...c }))),
    [template.modelKey, parameters, seed, constraints],
  );
  const kpiOptions = preview.kpis.map((k) => ({ value: k.key, label: k.label }));
  const isCurrency = CURRENCY_MODELS.includes(template.modelKey);

  const [newConstraint, setNewConstraint] = useState<{ metric: string; operator: ConstraintOperator; threshold: number }>({
    metric: kpiOptions[0]?.value ?? "",
    operator: "gte",
    threshold: 0,
  });

  function save(thenRun: boolean) {
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    let savedScenarioId = scenarioId;
    if (existing) {
      updateScenario(existing.id, {
        name: name || existing.name,
        description,
        category,
        tags: parsedTags,
        seed,
        parameters,
        assumptions: assumptions.map((a) => ({ id: a.id, statement: a.statement, confidence: a.confidence, rationale: a.rationale, createdAt: new Date().toISOString() })),
        constraints: constraints.map((c) => ({ id: c.id, label: c.label, metric: c.metric, operator: c.operator, threshold: c.threshold })),
      });
    } else {
      savedScenarioId = createScenario({
        simulationId: attachSimId,
        name: name || "Untitled scenario",
        description,
        templateId: template.id,
        parameters,
        category,
        tags: parsedTags,
        seed,
        assumptions: assumptions.map((a) => ({ statement: a.statement, confidence: a.confidence, rationale: a.rationale })),
        constraints: constraints.map((c) => ({ label: c.label, metric: c.metric, operator: c.operator, threshold: c.threshold })),
      });
    }
    if (thenRun && savedScenarioId) {
      startRun(savedScenarioId, `${name || "Scenario"} · run`);
      router.push("/simulations/runs");
      return;
    }
    onDone();
  }

  return (
    <SimCard
      title={existing ? `Edit scenario: ${existing.name}` : "Create a scenario"}
      description="Configure a simulation visually. The preview re-runs the model as you change inputs."
      action={
        <Button variant="ghost" size="sm" onClick={onDone}>
          <X className="size-4" /> Close
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-primary-text">Model template</label>
            <Select value={templateId} onValueChange={applyTemplate} disabled={Boolean(existing)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-secondary-text">{template.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary-text" htmlFor="scn-name">Scenario name</label>
              <Input id="scn-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aggressive launch" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">Category</label>
              <Input className="mt-1.5" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text" htmlFor="scn-desc">Description</label>
            <Textarea id="scn-desc" className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What question does this scenario answer?" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary-text">Tags (comma separated)</label>
              <Input className="mt-1.5" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="launch, q3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">Random seed</label>
              <Input className="mt-1.5" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-semibold text-primary-text">Parameters</p>
            <ParameterControls schema={template.parameters} values={parameters} onChange={(key, value) => setParameters((prev) => ({ ...prev, [key]: value }))} />
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-sm font-semibold text-primary-text">Assumptions</p>
            <div className="space-y-2">
              {assumptions.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-primary-text">{a.statement}</p>
                    <p className="text-xs text-secondary-text">Confidence: {a.confidence}</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Remove assumption" onClick={() => setAssumptions((prev) => prev.filter((x) => x.id !== a.id))}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {assumptions.length === 0 ? <p className="text-xs text-secondary-text">No assumptions yet.</p> : null}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input value={newAssumption} onChange={(e) => setNewAssumption(e.target.value)} placeholder="Add an assumption" />
              <Select value={newAssumptionConfidence} onValueChange={(v) => setNewAssumptionConfidence(v as "low" | "medium" | "high")}>
                <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                onClick={() => {
                  if (!newAssumption.trim()) return;
                  setAssumptions((prev) => [...prev, { id: localId("asm"), statement: newAssumption.trim(), confidence: newAssumptionConfidence }]);
                  setNewAssumption("");
                }}
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-2 text-sm font-semibold text-primary-text">Constraints</p>
            <div className="space-y-2">
              {constraints.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2">
                  <p className="text-sm text-primary-text">{c.label || `${c.metric} ${c.operator} ${c.threshold}`}</p>
                  <Button variant="ghost" size="icon" aria-label="Remove constraint" onClick={() => setConstraints((prev) => prev.filter((x) => x.id !== c.id))}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {constraints.length === 0 ? <p className="text-xs text-secondary-text">No constraints yet.</p> : null}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <Select value={newConstraint.metric} onValueChange={(v) => setNewConstraint((p) => ({ ...p, metric: v }))}>
                <SelectTrigger><SelectValue placeholder="Metric" /></SelectTrigger>
                <SelectContent>
                  {kpiOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newConstraint.operator} onValueChange={(v) => setNewConstraint((p) => ({ ...p, operator: v as ConstraintOperator }))}>
                <SelectTrigger className="sm:w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gte">≥</SelectItem>
                  <SelectItem value="lte">≤</SelectItem>
                  <SelectItem value="eq">=</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" className="sm:w-28" value={newConstraint.threshold} onChange={(e) => setNewConstraint((p) => ({ ...p, threshold: Number(e.target.value) }))} />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!newConstraint.metric) return;
                  const label = `${kpiOptions.find((o) => o.value === newConstraint.metric)?.label ?? newConstraint.metric} ${newConstraint.operator === "gte" ? "≥" : newConstraint.operator === "lte" ? "≤" : "="} ${newConstraint.threshold}`;
                  setConstraints((prev) => [...prev, { id: localId("con"), label, metric: newConstraint.metric, operator: newConstraint.operator, threshold: newConstraint.threshold }]);
                }}
              >
                <Plus className="size-4" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-primary-text">Live preview</p>
            <p className="text-xs text-secondary-text">{preview.outcomeSummary}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {preview.kpis.slice(0, 4).map((k) => (
                <div key={k.key} className="rounded-md bg-surface p-2">
                  <p className="text-[11px] text-secondary-text">{k.label}</p>
                  <p className="text-sm font-semibold text-primary-text">{k.display}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <SimulationLineChart series={preview.series} height={220} yFormatter={isCurrency ? (v) => `₹${compact(v)}` : compact} xLabel={template.modelKey === "pricing_sensitivity" ? "Price" : "Period"} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save(false)} disabled={!canEdit}>
              <Save className="size-4" /> {existing ? "Save changes" : "Save scenario"}
            </Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={!canEdit || !canRun}>
              <Play className="size-4" /> Save &amp; run
            </Button>
            <Button variant="ghost" onClick={onDone}>Cancel</Button>
          </div>
          {!canEdit ? <p className="text-xs text-danger">Your current role cannot create or edit scenarios. Switch to an Analyst or Admin in the header.</p> : null}
        </div>
      </div>
    </SimCard>
  );
}

function ScenarioList({ onEdit }: { onEdit: (id: string) => void }) {
  const router = useRouter();
  const scenarios = useSimulationStore((s) => s.scenarios);
  const simulations = useSimulationStore((s) => s.simulations);
  const cloneScenario = useSimulationStore((s) => s.cloneScenario);
  const archiveScenario = useSimulationStore((s) => s.archiveScenario);
  const deleteScenario = useSimulationStore((s) => s.deleteScenario);
  const startRun = useSimulationStore((s) => s.startRun);
  const saveScenarioAsTemplate = useSimulationStore((s) => s.saveScenarioAsTemplate);
  const canRun = usePermission("scenario.run");
  const canEdit = usePermission("simulation.edit");
  const canDelete = usePermission("simulation.delete");

  const [templateDialog, setTemplateDialog] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [templateName, setTemplateName] = useState("");

  const active = scenarios.filter((s) => s.status === "active");
  const archived = scenarios.filter((s) => s.status === "archived");

  function simName(id: string) {
    return simulations.find((s) => s.id === id)?.name ?? "Standalone";
  }

  function renderCard(sc: (typeof scenarios)[number]) {
    return (
      <div key={sc.id} className="operational-surface flex flex-col rounded-lg p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-primary-text">{sc.name}</p>
            <p className="text-xs text-secondary-text">{simName(sc.simulationId)} · {sc.category}</p>
          </div>
          {sc.isBaseline ? <Badge variant="ai">baseline</Badge> : null}
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-secondary-text">{sc.description || "No description."}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {sc.tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{t}</span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {sc.status === "active" ? (
            <>
              <Button size="sm" disabled={!canRun} onClick={() => { startRun(sc.id, `${sc.name} · run`); router.push("/simulations/runs"); }}>
                <Play className="size-4" /> Run
              </Button>
              <Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => onEdit(sc.id)}>Edit</Button>
              <Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => { const id = cloneScenario(sc.id); onEdit(id); }}>
                <Copy className="size-4" /> Clone
              </Button>
              <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => { setTemplateDialog({ id: sc.id, name: sc.name }); setTemplateName(`${sc.name} template`); }}>
                <FileStack className="size-4" /> Save as template
              </Button>
              <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => archiveScenario(sc.id)}>
                <Archive className="size-4" /> Archive
              </Button>
              <Button size="sm" variant="ghost" className="text-danger" disabled={!canDelete} onClick={() => setDeleteDialog({ id: sc.id, name: sc.name })}>
                <Trash2 className="size-4" /> Delete
              </Button>
            </>
          ) : (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <SimCard title="Scenarios" description={`${active.length} active · ${archived.length} archived`}>
        {active.length === 0 ? (
          <p className="text-sm text-secondary-text">No scenarios yet. Create one above.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(renderCard)}</div>
        )}
      </SimCard>

      {archived.length > 0 ? (
        <SimCard title="Archived scenarios">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{archived.map(renderCard)}</div>
        </SimCard>
      ) : null}

      <Dialog open={Boolean(templateDialog)} onOpenChange={(o) => !o && setTemplateDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>Reuse this scenario&apos;s configuration as a new template.</DialogDescription>
          </DialogHeader>
          <Input className="mt-4" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setTemplateDialog(null)}>Cancel</Button>
            <Button onClick={() => { if (templateDialog) saveScenarioAsTemplate(templateDialog.id, templateName || `${templateDialog.name} template`); setTemplateDialog(null); }}>Save template</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteDialog)} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scenario</DialogTitle>
            <DialogDescription>This permanently removes &quot;{deleteDialog?.name}&quot;. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteDialog) deleteScenario(deleteDialog.id); setDeleteDialog(null); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ScenarioBuilder() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const [creating, setCreating] = useState(false);
  const editingId = params.get("scenario") ?? undefined;
  const fromTemplate = params.get("template");

  if (!hydrated) return <ListSkeleton />;

  const showForm = creating || Boolean(editingId) || Boolean(fromTemplate);

  return (
    <SimShell
      title="Scenario Builder"
      description="Create, edit, clone, and govern simulation scenarios with visual controls — parameters, assumptions, and constraints — and a live preview."
      actions={
        !showForm ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New scenario
          </Button>
        ) : (
          <Link href={"/simulations/templates" as Route} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-primary-text focus-ring hover:bg-slate-50">
            Browse templates
          </Link>
        )
      }
    >
      {showForm ? (
        <ScenarioForm
          scenarioId={editingId}
          onDone={() => {
            setCreating(false);
            router.push("/simulations/scenarios");
          }}
        />
      ) : null}
      <ScenarioList onEdit={(id) => router.push(`/simulations/scenarios?scenario=${id}`)} />
    </SimShell>
  );
}
