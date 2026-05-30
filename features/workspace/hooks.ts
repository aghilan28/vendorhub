"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useSimulationStore } from "@/store/simulation-store";
import { useSecisStore } from "@/store/secis-store";
import { useGovernanceStore } from "@/store/governance-store";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { can, type ActionItem, type ActivityItem, type InboxItem, type Permission, type ProductAnalytics, type RefSystem } from "@/lib/workspace";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCurrentUser() {
  return useWorkspaceStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return can(user, permission);
}

export function useMyTasks() {
  const tasks = useWorkspaceStore((s) => s.tasks);
  const currentUserId = useWorkspaceStore((s) => s.currentUserId);
  return useMemo(() => tasks.filter((t) => t.assigneeId === currentUserId), [tasks, currentUserId]);
}

// ── Action Center: everything awaiting the user ──────────────────────────────

export function useActionItems(): ActionItem[] {
  const decisions = useGovernanceStore((s) => s.decisions);
  const exceptions = useGovernanceStore((s) => s.exceptions);
  const simRuns = useSimulationStore((s) => s.runs);
  const evoRuns = useSecisStore((s) => s.evolutionRuns);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const currentUserId = useWorkspaceStore((s) => s.currentUserId);

  return useMemo(() => {
    const items: ActionItem[] = [];
    for (const d of decisions.filter((x) => x.status === "review")) {
      items.push({ id: `rev-${d.id}`, kind: "review", system: "governance", title: d.title, detail: "Decision awaiting review", route: `/governance/decisions/${d.id}`, priority: d.impact });
      items.push({ id: `apr-${d.id}`, kind: "approval", system: "governance", title: d.title, detail: "Decision awaiting approval", route: `/governance/decisions/${d.id}`, priority: d.impact });
    }
    for (const e of exceptions.filter((x) => x.status === "requested" || x.status === "review")) {
      items.push({ id: `exc-${e.id}`, kind: "governance", system: "governance", title: e.title, detail: "Exception awaiting decision", route: "/governance/exceptions", priority: "medium" });
    }
    for (const r of simRuns.filter((x) => x.status === "running" || x.status === "paused")) {
      items.push({ id: `sim-${r.id}`, kind: "simulation", system: "simulation", title: r.label, detail: "Simulation run in progress", route: "/simulations/runs", priority: "medium" });
    }
    for (const r of evoRuns.filter((x) => x.status === "running" || x.status === "paused")) {
      items.push({ id: `evo-${r.id}`, kind: "simulation", system: "secis", title: r.name, detail: "Evolution run in progress", route: "/secis/evolution", priority: "medium" });
    }
    for (const t of tasks.filter((x) => x.assigneeId === currentUserId && x.status !== "done")) {
      items.push({ id: `tsk-${t.id}`, kind: "task", system: t.system ?? "intelligence", title: t.title, detail: `Task (${t.status.replace("_", " ")})`, route: t.route ?? "/workspace/projects", priority: t.priority });
    }
    const rank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return items.sort((a, b) => rank[a.priority] - rank[b.priority]);
  }, [decisions, exceptions, simRuns, evoRuns, tasks, currentUserId]);
}

// ── Intelligence Inbox: unified signals ──────────────────────────────────────

export function useInbox(): InboxItem[] {
  const simInsights = useSimulationStore((s) => s.insights);
  const simRecs = useSimulationStore((s) => s.recommendations);
  const secisRecs = useSecisStore((s) => s.recommendations);
  const govRisks = useGovernanceStore((s) => s.risks);
  const govDecisions = useGovernanceStore((s) => s.decisions);
  const govExceptions = useGovernanceStore((s) => s.exceptions);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const currentUserId = useWorkspaceStore((s) => s.currentUserId);

  return useMemo(() => {
    const items: InboxItem[] = [];
    for (const i of simInsights.filter((x) => x.kind === "opportunity" || x.kind === "risk" || x.kind === "warning").slice(0, 8)) {
      items.push({ id: `ins-${i.id}`, kind: i.kind === "opportunity" ? "insight" : i.kind === "risk" ? "risk" : "warning", system: "simulation", title: i.title, detail: i.detail, route: `/simulations/results?run=${i.runId}`, at: i.createdAt });
    }
    for (const r of simRecs.filter((x) => !x.accepted).slice(0, 6)) {
      items.push({ id: `srec-${r.id}`, kind: "recommendation", system: "simulation", title: r.title, detail: r.expectedImpact, route: `/simulations/results?run=${r.runId}`, at: r.createdAt });
    }
    for (const r of secisRecs.filter((x) => !x.accepted).slice(0, 6)) {
      items.push({ id: `xrec-${r.id}`, kind: "recommendation", system: "secis", title: r.title, detail: r.expectedImpact, route: `/secis/${r.changeEventId}`, at: r.createdAt });
    }
    for (const r of govRisks.filter((x) => (x.severity === "high" || x.severity === "critical") && (x.status === "open" || x.status === "mitigating"))) {
      items.push({ id: `risk-${r.id}`, kind: "risk", system: "governance", title: r.title, detail: `${r.severity} risk (${r.status})`, route: "/governance/risks", at: r.updatedAt });
    }
    for (const d of govDecisions.filter((x) => x.status === "review")) {
      items.push({ id: `appr-${d.id}`, kind: "approval", system: "governance", title: d.title, detail: "Awaiting your approval", route: `/governance/decisions/${d.id}`, at: d.updatedAt });
    }
    for (const e of govExceptions.filter((x) => x.status === "requested" || x.status === "review")) {
      items.push({ id: `exc-${e.id}`, kind: "exception", system: "governance", title: e.title, detail: "Exception awaiting decision", route: "/governance/exceptions", at: e.updatedAt });
    }
    for (const t of tasks.filter((x) => x.assigneeId === currentUserId && x.status !== "done")) {
      items.push({ id: `task-${t.id}`, kind: "task", system: t.system ?? "intelligence", title: t.title, detail: `Assigned task (${t.priority})`, route: t.route ?? "/workspace/projects", at: t.updatedAt });
    }
    return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [simInsights, simRecs, secisRecs, govRisks, govDecisions, govExceptions, tasks, currentUserId]);
}

// ── Activity timeline (merged across systems) ────────────────────────────────

export function useActivity(limit = 30): ActivityItem[] {
  const provenance = useIntelligenceStore((s) => s.provenance);
  const simHistory = useSimulationStore((s) => s.history);
  const secisHistory = useSecisStore((s) => s.history);
  const govAudit = useGovernanceStore((s) => s.audit);

  return useMemo(() => {
    const merged: ActivityItem[] = [
      ...provenance.map((p) => ({ id: p.id, system: p.system as RefSystem, summary: p.summary, actor: p.actorName, at: p.at })),
      ...simHistory.map((h) => ({ id: h.id, system: "simulation" as RefSystem, summary: h.summary, actor: h.actorName, at: h.at })),
      ...secisHistory.map((h) => ({ id: h.id, system: "secis" as RefSystem, summary: h.summary, actor: h.actorName, at: h.at })),
      ...govAudit.map((a) => ({ id: a.id, system: "governance" as RefSystem, summary: a.summary, actor: a.actorName, at: a.at })),
    ];
    return merged.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, limit);
  }, [provenance, simHistory, secisHistory, govAudit, limit]);
}

// ── Unified search (systems + projects + tasks) ──────────────────────────────

export interface WorkspaceSearchResult {
  id: string;
  system: string;
  type: string;
  title: string;
  status: string;
  route: string;
  date: string;
}

export function useWorkspaceSearch(query: string, system: string): Record<string, WorkspaceSearchResult[]> {
  const projects = useWorkspaceStore((s) => s.projects);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const sims = useSimulationStore((s) => s.simulations);
  const events = useSecisStore((s) => s.changeEvents);
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);
  const nodes = useIntelligenceStore((s) => s.nodes);

  return useMemo(() => {
    const all: WorkspaceSearchResult[] = [];
    for (const p of projects) all.push({ id: p.id, system: "projects", type: "Project", title: p.name, status: p.status, route: `/workspace/projects?project=${p.id}`, date: p.updatedAt });
    for (const t of tasks) all.push({ id: t.id, system: "tasks", type: "Task", title: t.title, status: t.status, route: t.route ?? "/workspace/projects", date: t.updatedAt });
    for (const n of nodes.filter((x) => x.stage === "research" || x.stage === "knowledge")) all.push({ id: n.id, system: n.stage, type: n.stage === "research" ? "Research" : "Knowledge", title: n.title, status: n.status, route: n.refRoute ?? "/intelligence/lineage", date: n.updatedAt });
    for (const s of sims) all.push({ id: s.id, system: "simulation", type: "Simulation", title: s.name, status: s.workflowState, route: `/simulations/${s.id}`, date: s.updatedAt });
    for (const e of events) all.push({ id: e.id, system: "secis", type: "Change event", title: e.name, status: e.workflowState, route: `/secis/${e.id}`, date: e.updatedAt });
    for (const p of policies) all.push({ id: p.id, system: "governance", type: "Policy", title: p.title, status: p.status, route: `/governance/policies/${p.id}`, date: p.updatedAt });
    for (const d of decisions) all.push({ id: d.id, system: "governance", type: "Decision", title: d.title, status: d.status, route: `/governance/decisions/${d.id}`, date: d.updatedAt });

    const q = query.trim().toLowerCase();
    const filtered = all.filter((i) => (system === "all" || i.system === system) && (!q || `${i.title} ${i.type} ${i.status}`.toLowerCase().includes(q)));
    filtered.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const grouped: Record<string, WorkspaceSearchResult[]> = {};
    for (const item of filtered) {
      const group = item.type;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(item);
    }
    return grouped;
  }, [projects, tasks, sims, events, policies, decisions, nodes, query, system]);
}

// ── Product analytics ─────────────────────────────────────────────────────────

export function useProductAnalytics(): ProductAnalytics {
  const projects = useWorkspaceStore((s) => s.projects);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const notifications = useWorkspaceStore((s) => s.notifications);
  const sims = useSimulationStore((s) => s.simulations);
  const simRuns = useSimulationStore((s) => s.runs);
  const decisions = useGovernanceStore((s) => s.decisions);
  const policies = useGovernanceStore((s) => s.policies);
  const events = useSecisStore((s) => s.changeEvents);
  const workflows = useIntelligenceStore((s) => s.workflows);
  const nodes = useIntelligenceStore((s) => s.nodes);

  return useMemo(() => {
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const resolvedDecisions = decisions.filter((d) => d.status === "approved" || d.status === "rejected").length;
    const research = nodes.filter((n) => n.stage === "research").length;
    const knowledge = nodes.filter((n) => n.stage === "knowledge").length;
    return {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      tasks: tasks.length,
      taskCompletion: tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0,
      openTasks: tasks.filter((t) => t.status !== "done").length,
      workflowCompletion: workflows.length ? Math.round((workflows.filter((w) => w.status === "complete").length / workflows.length) * 100) : 0,
      approvalVelocity: decisions.length ? Math.round((resolvedDecisions / decisions.length) * 100) : 0,
      simulationUsage: simRuns.length,
      researchUsage: research,
      knowledgeUsage: knowledge,
      governanceUsage: decisions.length + policies.length,
      notifications: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      usageByStage: [
        { label: "Research", value: research },
        { label: "Knowledge", value: knowledge },
        { label: "Simulation", value: sims.length },
        { label: "SECIS", value: events.length },
        { label: "Governance", value: decisions.length },
      ],
    };
  }, [projects, tasks, notifications, sims, simRuns, decisions, policies, events, workflows, nodes]);
}
