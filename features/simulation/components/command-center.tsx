"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  GaugeCircle,
  Layers,
  Lightbulb,
  Play,
  Plus,
  Sparkles,
  Target,
  Timer,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { WORKFLOW_ORDER } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, useSimulationAnalytics } from "../hooks";
import { formatRuntime, relativeTime, INSIGHT_META, WORKFLOW_META } from "../format";
import { SimShell, SimCard, StatTile, RunStatusBadge } from "./primitives";
import { CommandCenterSkeleton } from "./skeletons";
import { AnalyticsPanel } from "./analytics-panel";

export function CommandCenter() {
  const hydrated = useHydrated();
  const analytics = useSimulationAnalytics();
  const simulations = useSimulationStore((s) => s.simulations);
  const scenarios = useSimulationStore((s) => s.scenarios);
  const runs = useSimulationStore((s) => s.runs);
  const insights = useSimulationStore((s) => s.insights);
  const recommendations = useSimulationStore((s) => s.recommendations);
  const decisions = useSimulationStore((s) => s.decisions);

  if (!hydrated) return <CommandCenterSkeleton />;

  const recentRuns = [...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 6);
  const recentScenarios = [...scenarios].filter((s) => s.status === "active").sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 5);
  const topInsights = insights.filter((i) => i.kind === "opportunity" || i.kind === "risk" || i.kind === "warning").slice(0, 5);
  const topRecs = [...recommendations].sort((a, b) => (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0)).slice(0, 4);
  const recentDecisions = decisions.slice(0, 4);
  const workflowCounts = WORKFLOW_ORDER.map((state) => ({ state, count: simulations.filter((s) => s.workflowState === state).length }));

  return (
    <SimShell
      title="Simulation Command Center"
      description="The operating center for every simulation: live run health, recent activity, insights, recommendations, workflow status, and decisions — all in one place."
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/simulations/runs">
              <Play className="size-4" /> Execution
            </Link>
          </Button>
          <Button asChild>
            <Link href="/simulations/scenarios">
              <Plus className="size-4" /> New scenario
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Simulations" value={String(analytics.totalSimulations)} helper={`${analytics.activeSimulations} active · ${analytics.archivedSimulations} archived`} icon={Layers} tone="info" />
        <StatTile label="Total runs" value={String(analytics.totalRuns)} helper={`${analytics.completedRuns} completed · ${analytics.runningRuns} live`} icon={Play} tone="success" />
        <StatTile label="Success rate" value={`${analytics.successRate}%`} helper={`${analytics.failureRate}% failed/cancelled`} icon={CheckCircle2} tone={analytics.successRate >= 80 ? "success" : "warning"} />
        <StatTile label="Avg runtime" value={formatRuntime(analytics.avgRuntimeMs)} helper="Across completed runs" icon={Timer} tone="neutral" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Scenario coverage" value={`${analytics.scenarioCoverage}%`} helper={`${analytics.activeScenarios} active scenarios`} icon={Target} tone="info" />
        <StatTile label="Insights generated" value={String(analytics.totalInsights)} helper={`${analytics.totalRecommendations} recommendations`} icon={Lightbulb} tone="info" />
        <StatTile label="Pending reviews" value={String(analytics.pendingReviews)} helper={`${analytics.pendingApprovals} awaiting approval`} icon={Workflow} tone={analytics.pendingReviews ? "warning" : "neutral"} />
        <StatTile label="Decisions" value={String(analytics.totalDecisions)} helper={`${analytics.highImpactDecisions} high impact`} icon={GaugeCircle} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SimCard title="Run activity" description="Executions over time and engine throughput." action={<Badge variant="ai"><Activity className="size-3" /> {analytics.runningRuns} live</Badge>}>
          <OperationalBarChart values={analytics.runsTrend.some((v) => v > 0) ? analytics.runsTrend : [0]} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Completed</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.completedRuns}</p></div>
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Running</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.runningRuns}</p></div>
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Cancelled</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.cancelledRuns}</p></div>
          </div>
        </SimCard>

        <SimCard title="Workflow overview" description="Where simulations sit in the lifecycle." action={<Link href={"/simulations/workflows" as Route} className="text-xs font-medium text-ai hover:underline">Open</Link>}>
          <div className="space-y-2">
            {workflowCounts.map(({ state, count }) => (
              <div key={state} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm text-primary-text">{WORKFLOW_META[state].label}</span>
                <Badge variant={count ? WORKFLOW_META[state].variant : "secondary"}>{count}</Badge>
              </div>
            ))}
          </div>
        </SimCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Recent runs" description="Latest executions across all simulations." action={<Link href={"/simulations/results" as Route} className="text-xs font-medium text-ai hover:underline">All results</Link>}>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-secondary-text">No runs yet. Start one from the Execution Center.</p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <Link key={run.id} href={`/simulations/results?run=${run.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{run.label}</p>
                    <p className="text-xs text-secondary-text">{run.scenarioName} · {relativeTime(run.startedAt)}</p>
                  </div>
                  <RunStatusBadge status={run.status} />
                </Link>
              ))}
            </div>
          )}
        </SimCard>

        <SimCard title="Recent scenarios" description="Recently configured, ready to run." action={<Link href={"/simulations/scenarios" as Route} className="text-xs font-medium text-ai hover:underline">Builder</Link>}>
          {recentScenarios.length === 0 ? (
            <p className="text-sm text-secondary-text">No scenarios yet.</p>
          ) : (
            <div className="space-y-2">
              {recentScenarios.map((sc) => (
                <Link key={sc.id} href={`/simulations/scenarios?scenario=${sc.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{sc.name}</p>
                    <p className="text-xs text-secondary-text">{sc.category} · {sc.tags.join(", ") || "no tags"}</p>
                  </div>
                  {sc.isBaseline ? <Badge variant="ai">baseline</Badge> : <Badge variant="secondary">scenario</Badge>}
                </Link>
              ))}
            </div>
          )}
        </SimCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Top insights" description="Highest-signal opportunities and risks." action={<Link href={"/simulations/insights" as Route} className="text-xs font-medium text-ai hover:underline">Insight center</Link>}>
          {topInsights.length === 0 ? (
            <p className="text-sm text-secondary-text">Insights appear after runs complete.</p>
          ) : (
            <div className="space-y-2">
              {topInsights.map((insight) => {
                const Icon = INSIGHT_META[insight.kind].icon;
                return (
                  <div key={insight.id} className="flex items-start gap-2 rounded-md border border-border p-3">
                    <Icon className="mt-0.5 size-4 text-secondary-text" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-primary-text">{insight.title}</p>
                      <p className="text-xs text-secondary-text">{insight.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SimCard>

        <SimCard title="Recommendations" description="Actions the simulations suggest." action={<Link href={"/simulations/recommendations" as Route} className="text-xs font-medium text-ai hover:underline">All</Link>}>
          {topRecs.length === 0 ? (
            <p className="text-sm text-secondary-text">No recommendations yet.</p>
          ) : (
            <div className="space-y-2">
              {topRecs.map((rec) => (
                <div key={rec.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary-text">{rec.title}</p>
                    <Badge variant={rec.priority === "high" ? "danger" : rec.priority === "medium" ? "warning" : "secondary"}>{rec.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{rec.expectedImpact}</p>
                </div>
              ))}
            </div>
          )}
        </SimCard>
      </div>

      <SimCard title="Decision overview" description="Decisions recorded from simulation outcomes." action={<Sparkles className="size-4 text-secondary-text" />}>
        {recentDecisions.length === 0 ? (
          <p className="text-sm text-secondary-text">No decisions recorded yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {recentDecisions.map((d) => (
              <div key={d.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{d.title}</p>
                  <Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{d.rationale}</p>
                <p className="mt-2 text-[11px] text-secondary-text">Impact {d.impact} · {relativeTime(d.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </SimCard>

      <AnalyticsPanel />

      <SimCard title="Quick navigation">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/simulations/scenarios", label: "Scenario Builder", icon: Plus },
            { href: "/simulations/runs", label: "Execution Center", icon: Play },
            { href: "/simulations/results", label: "Analysis Studio", icon: BarChart3 },
            { href: "/simulations/compare", label: "Comparison Engine", icon: Activity },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href as Route} className="flex items-center gap-3 rounded-md border border-border p-3 focus-ring hover:bg-slate-50">
                <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand"><Icon className="size-4" /></span>
                <span className="text-sm font-medium text-primary-text">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </SimCard>
    </SimShell>
  );
}
