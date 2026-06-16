"use client";

import { useEffect, useMemo, useState } from "react";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { useSimulationStore } from "@/store/simulation-store";
import { useSecisStore } from "@/store/secis-store";
import { useGovernanceStore } from "@/store/governance-store";
import { can, type PendingAction, type Permission, type SearchItem, type SystemActivity, type UnifiedAction } from "@/lib/intelligence-platform";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCurrentUser() {
  return useIntelligenceStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return can(user, permission);
}

// ── System activity (unified dashboard) ──────────────────────────────────────

export function useSystemActivity(): SystemActivity[] {
  const nodes = useIntelligenceStore((s) => s.nodes);
  const sims = useSimulationStore((s) => s.simulations);
  const simRuns = useSimulationStore((s) => s.runs);
  const events = useSecisStore((s) => s.changeEvents);
  const evoRuns = useSecisStore((s) => s.evolutionRuns);
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);

  return useMemo(
    () => [
      { stage: "research", label: "Research", primary: nodes.filter((n) => n.stage === "research").length, primaryLabel: "studies", secondary: nodes.filter((n) => n.stage === "research" && n.status === "complete").length, secondaryLabel: "complete", route: "/intelligence/workflows" },
      { stage: "knowledge", label: "Knowledge", primary: nodes.filter((n) => n.stage === "knowledge").length, primaryLabel: "assets", secondary: nodes.filter((n) => n.stage === "knowledge" && n.status === "complete").length, secondaryLabel: "published", route: "/intelligence/workflows" },
      { stage: "simulation", label: "Simulation", primary: sims.length, primaryLabel: "simulations", secondary: simRuns.filter((r) => r.status === "completed").length, secondaryLabel: "runs", route: "/simulations" },
      { stage: "secis", label: "Impact (SECIS)", primary: events.length, primaryLabel: "change events", secondary: evoRuns.length, secondaryLabel: "evolution runs", route: "/secis" },
      { stage: "governance", label: "Governance", primary: decisions.length, primaryLabel: "decisions", secondary: policies.filter((p) => p.status === "published").length, secondaryLabel: "policies", route: "/governance" },
    ],
    [nodes, sims, simRuns, events, evoRuns, policies, decisions],
  );
}

// ── Recent actions (merged provenance + per-system audit/history) ────────────

export function useRecentActions(limit = 12): UnifiedAction[] {
  const provenance = useIntelligenceStore((s) => s.provenance);
  const simHistory = useSimulationStore((s) => s.history);
  const secisHistory = useSecisStore((s) => s.history);
  const govAudit = useGovernanceStore((s) => s.audit);

  return useMemo(() => {
    const merged: UnifiedAction[] = [
      ...provenance.map((p) => ({ id: p.id, system: p.system, summary: p.summary, actor: p.actorName, at: p.at })),
      ...simHistory.map((h) => ({ id: h.id, system: "simulation" as const, summary: h.summary, actor: h.actorName, at: h.at })),
      ...secisHistory.map((h) => ({ id: h.id, system: "secis" as const, summary: h.summary, actor: h.actorName, at: h.at })),
      ...govAudit.map((a) => ({ id: a.id, system: "governance" as const, summary: a.summary, actor: a.actorName, at: a.at })),
    ];
    return merged.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
  }, [provenance, simHistory, secisHistory, govAudit, limit]);
}

// ── Pending actions across systems ───────────────────────────────────────────

export function usePendingActions(): PendingAction[] {
  const workflows = useIntelligenceStore((s) => s.workflows);
  const simRuns = useSimulationStore((s) => s.runs);
  const evoRuns = useSecisStore((s) => s.evolutionRuns);
  const decisions = useGovernanceStore((s) => s.decisions);

  return useMemo(() => {
    const items: PendingAction[] = [];
    for (const w of workflows.filter((x) => x.status === "active" || x.status === "blocked")) {
      const stage = w.stages.find((s) => s.status === "in_progress" || s.status === "blocked");
      if (stage) items.push({ id: `wf-${w.id}`, system: stage.stage, title: w.name, detail: `${stage.stage} stage ${stage.status === "blocked" ? "blocked" : "in progress"}`, route: "/intelligence/workflows" });
    }
    for (const d of decisions.filter((x) => x.status === "review")) items.push({ id: `gov-${d.id}`, system: "governance", title: d.title, detail: "Decision awaiting approval", route: `/governance/decisions/${d.id}` });
    for (const r of simRuns.filter((x) => x.status === "running" || x.status === "paused")) items.push({ id: `sim-${r.id}`, system: "simulation", title: r.label, detail: "Simulation run in progress", route: "/simulations/runs" });
    for (const r of evoRuns.filter((x) => x.status === "running" || x.status === "paused")) items.push({ id: `secis-${r.id}`, system: "secis", title: r.name, detail: "Evolution run in progress", route: "/secis/evolution" });
    return items;
  }, [workflows, simRuns, evoRuns, decisions]);
}

// ── Cross-system search ──────────────────────────────────────────────────────

export interface SearchFilters {
  query: string;
  system: string; // "all" or a System/marketplace
  status: string; // "all" or status text
}

export function useSearchIndex(): SearchItem[] {
  const nodes = useIntelligenceStore((s) => s.nodes);
  const sims = useSimulationStore((s) => s.simulations);
  const scenarios = useSimulationStore((s) => s.scenarios);
  const events = useSecisStore((s) => s.changeEvents);
  const entities = useSecisStore((s) => s.entities);
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);
  const risks = useGovernanceStore((s) => s.risks);

  return useMemo(() => {
    const items: SearchItem[] = [];
    for (const n of nodes.filter((x) => x.stage === "research" || x.stage === "knowledge")) {
      items.push({ id: n.id, system: n.stage, type: n.stage === "research" ? "Research" : "Knowledge", title: n.title, status: n.status, owner: n.ownerName, date: n.updatedAt, tags: n.tags, route: n.refRoute ?? "/intelligence/lineage" });
    }
    for (const s of sims) items.push({ id: s.id, system: "simulation", type: "Simulation", title: s.name, status: s.workflowState, owner: s.ownerName, date: s.updatedAt, tags: s.tags, route: `/simulations/${s.id}` });
    for (const sc of scenarios) items.push({ id: sc.id, system: "simulation", type: "Scenario", title: sc.name, status: sc.status, owner: "", date: sc.updatedAt, tags: sc.tags, route: `/simulations/scenarios?scenario=${sc.id}` });
    for (const e of events) items.push({ id: e.id, system: "secis", type: "Change event", title: e.name, status: e.workflowState, owner: e.ownerName, date: e.updatedAt, tags: e.tags, route: `/secis/${e.id}` });
    for (const en of entities) items.push({ id: en.id, system: "secis", type: "Entity", title: en.name, status: en.status, owner: "", date: en.updatedAt, tags: en.tags, route: "/secis/entities" });
    for (const p of policies) items.push({ id: p.id, system: "governance", type: "Policy", title: p.title, status: p.status, owner: p.ownerName, date: p.updatedAt, tags: p.tags, route: `/governance/policies/${p.id}` });
    for (const d of decisions) items.push({ id: d.id, system: "governance", type: "Decision", title: d.title, status: d.status, owner: d.ownerName, date: d.updatedAt, tags: d.tags, route: `/governance/decisions/${d.id}` });
    for (const r of risks) items.push({ id: r.id, system: "governance", type: "Risk", title: r.title, status: r.status, owner: r.ownerName, date: r.updatedAt, tags: [r.category], route: "/governance/risks" });
    return items;
  }, [nodes, sims, scenarios, events, entities, policies, decisions, risks]);
}

export function useUnifiedSearch(filters: SearchFilters): SearchItem[] {
  const index = useSearchIndex();
  return useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return index
      .filter((item) => {
        if (filters.system !== "all" && item.system !== filters.system) return false;
        if (filters.status !== "all" && item.status !== filters.status) return false;
        if (q && !(`${item.title} ${item.type} ${item.owner} ${item.tags.join(" ")}`.toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [index, filters.query, filters.system, filters.status]);
}

// ── Workflow provenance (merged across systems) ──────────────────────────────

export interface MergedProvenance {
  id: string;
  stage: string;
  action: string;
  actor: string;
  summary: string;
  at: string;
}

export function useWorkflowProvenance(workflowId: string | undefined): MergedProvenance[] {
  const provenance = useIntelligenceStore((s) => s.provenance.filter((p) => p.workflowId === workflowId));
  const workflow = useIntelligenceStore((s) => s.workflows.find((w) => w.id === workflowId));
  const govAudit = useGovernanceStore((s) => s.audit);
  const secisHistory = useSecisStore((s) => s.history);

  return useMemo(() => {
    const out: MergedProvenance[] = provenance.map((p) => ({ id: p.id, stage: p.stage, action: p.action, actor: p.actorName, summary: p.summary, at: p.at }));
    if (workflow) {
      const govStage = workflow.stages.find((st) => st.stage === "governance");
      if (govStage?.refId) {
        for (const a of govAudit.filter((x) => x.objectId === govStage.refId)) out.push({ id: a.id, stage: "governance", action: a.action, actor: a.actorName, summary: a.summary, at: a.at });
      }
      const secisStage = workflow.stages.find((st) => st.stage === "secis");
      if (secisStage?.refId) {
        for (const h of secisHistory.filter((x) => x.changeEventId === secisStage.refId)) out.push({ id: h.id, stage: "secis", action: h.action, actor: h.actorName, summary: h.summary, at: h.at });
      }
    }
    return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [provenance, workflow, govAudit, secisHistory]);
}
