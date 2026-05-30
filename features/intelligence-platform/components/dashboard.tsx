"use client";

import Link from "next/link";
import type { Route } from "next";
import { Activity, GitBranch, Network, Workflow as WorkflowIcon, Search, ShieldCheck, FlaskConical, Waypoints, ArrowRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STAGE_META, STAGE_ORDER } from "@/lib/intelligence-platform";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { useHydrated, useSystemActivity, useRecentActions, usePendingActions } from "../hooks";
import { relativeTime } from "../format";
import { IntelShell, IntelCard, StatTile, NavCard, SystemPill } from "./primitives";
import { DashboardSkeleton } from "./skeletons";

export function IntelligenceDashboard() {
  const hydrated = useHydrated();
  const activity = useSystemActivity();
  const recent = useRecentActions(10);
  const pending = usePendingActions();
  const workflows = useIntelligenceStore((s) => s.workflows);
  const nodes = useIntelligenceStore((s) => s.nodes);

  if (!hydrated) return <DashboardSkeleton />;

  const activeWf = workflows.filter((w) => w.status === "active");
  const completeWf = workflows.filter((w) => w.status === "complete");
  const blockedWf = workflows.filter((w) => w.status === "blocked");
  const workflowHealth = workflows.length ? Math.round(((workflows.length - blockedWf.length) / workflows.length) * 100) : 100;
  const linkedStages = workflows.flatMap((w) => w.stages).filter((s) => s.refId || s.refRoute);
  const totalStages = workflows.flatMap((w) => w.stages).length || 1;
  const lineageHealth = Math.round((linkedStages.length / totalStages) * 100);
  const systemsLive = activity.filter((a) => a.primary > 0).length;

  return (
    <IntelShell
      title="Unified Intelligence Dashboard"
      description="One platform across Research, Knowledge, Simulation, Impact (SECIS), and Governance — with a single view of activity, workflows, lineage, and what needs attention."
      actions={
        <>
          <Button asChild variant="secondary"><Link href="/intelligence/search"><Search className="size-4" /> Search</Link></Button>
          <Button asChild><Link href="/intelligence/workflows"><WorkflowIcon className="size-4" /> Workflows</Link></Button>
        </>
      }
    >
      {/* Lifecycle banner */}
      <IntelCard title="The intelligence lifecycle" description="Every initiative flows through these five stages as one continuous workflow.">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className="flex flex-1 items-center gap-2">
              <Link href={STAGE_META[stage].route as Route} className="flex flex-1 items-center gap-2 rounded-md border border-border p-2.5 focus-ring hover:bg-slate-50">
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: STAGE_META[stage].color }} />
                <span className="text-sm font-medium text-primary-text">{STAGE_META[stage].label}</span>
              </Link>
              {i < STAGE_ORDER.length - 1 ? <ArrowRight className="hidden size-4 shrink-0 text-secondary-text sm:block" /> : null}
            </div>
          ))}
        </div>
      </IntelCard>

      {/* Activity per system */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {activity.map((a) => (
          <Link key={a.stage} href={a.route as Route} className="operational-surface rounded-lg p-4 focus-ring hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-secondary-text">{a.label}</p>
              <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: STAGE_META[a.stage].color }} />
            </div>
            <p className="metric-value mt-2">{a.primary}</p>
            <p className="text-xs text-secondary-text">{a.primaryLabel} · {a.secondary} {a.secondaryLabel}</p>
          </Link>
        ))}
      </div>

      {/* Health */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="System health" value={`${systemsLive}/5`} helper="systems with activity" icon={Network} tone={systemsLive >= 5 ? "success" : "warning"} />
        <StatTile label="Workflow health" value={`${workflowHealth}%`} helper={`${activeWf.length} active · ${blockedWf.length} blocked`} icon={WorkflowIcon} tone={workflowHealth >= 80 ? "success" : "warning"} />
        <StatTile label="Lineage health" value={`${lineageHealth}%`} helper={`${linkedStages.length}/${totalStages} stages linked`} icon={GitBranch} tone={lineageHealth >= 70 ? "success" : "warning"} />
        <StatTile label="Workflows" value={String(workflows.length)} helper={`${completeWf.length} complete · ${nodes.length} lineage nodes`} icon={Activity} tone="info" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <IntelCard title="Pending actions" description="What needs attention across all systems." action={<Badge variant={pending.length ? "warning" : "default"}>{pending.length}</Badge>}>
          {pending.length === 0 ? <p className="text-sm text-secondary-text">Nothing pending across the platform.</p> : (
            <div className="space-y-2">
              {pending.slice(0, 8).map((p) => (
                <Link key={p.id} href={p.route as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{p.title}</p><p className="text-xs text-secondary-text">{p.detail}</p></div>
                  <SystemPill system={p.system} />
                </Link>
              ))}
            </div>
          )}
        </IntelCard>

        <IntelCard title="Recent actions" description="A unified feed across every system." action={<Link href={"/intelligence/provenance" as Route} className="text-xs font-medium text-ai hover:underline">Provenance</Link>}>
          <div className="space-y-2">
            {recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-primary-text">{a.summary}</p><p className="text-xs text-secondary-text"><Clock className="inline size-3" /> {a.actor} · {relativeTime(a.at)}</p></div>
                <SystemPill system={a.system} />
              </div>
            ))}
          </div>
        </IntelCard>
      </div>

      <IntelCard title="Jump into a system" description="The platform is your hub — open any operating system directly.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavCard href="/simulations" label="Simulation OS" icon={FlaskConical} external="Model outcomes" />
          <NavCard href="/secis" label="SECIS" icon={Waypoints} external="Analyse change impact" />
          <NavCard href="/governance" label="Governance OS" icon={ShieldCheck} external="Decide & approve" />
          <NavCard href="/intelligence/lineage" label="Lineage Center" icon={GitBranch} external="Trace end to end" />
        </div>
      </IntelCard>
    </IntelShell>
  );
}
