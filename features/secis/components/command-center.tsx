"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  Boxes,
  Gauge,
  GitCompare,
  Layers,
  Lightbulb,
  Network,
  Plus,
  ShieldAlert,
  Waypoints,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { formatCurrencyCompact } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, useSecisAnalytics } from "../hooks";
import { EVENT_TYPE_ICON, WORKFLOW_META, relativeTime, riskVariant } from "../format";
import { SecisShell, SecisCard, StatTile, NavCard, RunStatusBadge, WorkflowBadge } from "./primitives";
import { HBars } from "./charts";
import { DashboardSkeleton } from "./skeletons";

export function CommandCenter() {
  const hydrated = useHydrated();
  const analytics = useSecisAnalytics();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const runs = useSecisStore((s) => s.evolutionRuns);
  const recommendations = useSecisStore((s) => s.recommendations);
  const systems = useSecisStore((s) => s.systems);

  if (!hydrated) return <DashboardSkeleton />;

  const recentEvents = [...changeEvents].filter((e) => e.status === "active").sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 5);
  const recentRuns = [...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 5);
  const topRecs = [...recommendations].sort((a, b) => (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0)).slice(0, 4);

  return (
    <SecisShell
      title="System Evolution Operating Center"
      description="A live view of your system: dependency health, change-impact exposure, risk, evolution recovery, and the recommendations that follow — all in one command center."
      actions={
        <>
          <Button asChild variant="secondary">
            <Link href="/secis/impact"><Gauge className="size-4" /> Impact</Link>
          </Button>
          <Button asChild>
            <Link href="/secis/change-events"><Plus className="size-4" /> New change event</Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Systems" value={String(analytics.systems)} helper={`${analytics.entities} entities`} icon={Layers} tone="info" />
        <StatTile label="Dependency health" value={`${analytics.dependencyHealth}%`} helper={`${analytics.singlePointsOfFailure} single points of failure`} icon={Waypoints} tone={analytics.dependencyHealth >= 70 ? "success" : analytics.dependencyHealth >= 45 ? "warning" : "danger"} />
        <StatTile label="Portfolio risk" value={`${analytics.portfolioRiskScore}/100`} helper={`${analytics.portfolioRiskLevel} across ${analytics.activeEvents} events`} icon={ShieldAlert} tone={analytics.portfolioRiskScore >= 55 ? "danger" : analytics.portfolioRiskScore >= 30 ? "warning" : "success"} />
        <StatTile label="Max revenue at risk" value={formatCurrencyCompact(analytics.totalRevenueAtRiskMax)} helper="Worst active event / month" icon={Gauge} tone="warning" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Change events" value={String(analytics.activeEvents)} helper={`${analytics.analyzedEvents} analyzed`} icon={Zap} tone="neutral" />
        <StatTile label="Evolution runs" value={String(analytics.totalRuns)} helper={`${analytics.completedRuns} completed · ${analytics.runningRuns} live`} icon={Activity} tone="info" />
        <StatTile label="Avg resilience" value={`${analytics.avgResilience}/100`} helper="Across completed runs" icon={Network} tone={analytics.avgResilience >= 70 ? "success" : "warning"} />
        <StatTile label="Recommendations" value={String(analytics.recommendations)} helper={`${analytics.acceptedRecommendations} accepted`} icon={Lightbulb} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Impact overview" description="Worst-case impact by dimension across active events.">
          <HBars
            rows={analytics.impactByDimension.map((d) => ({ label: d.dimension.charAt(0).toUpperCase() + d.dimension.slice(1), value: d.score, display: `${d.score}/100`, tone: d.score >= 66 ? "danger" : d.score >= 40 ? "warning" : "brand" }))}
          />
        </SecisCard>

        <SecisCard title="Risk overview" description="Highest-risk active change events." action={<Link href={"/secis/risk" as Route} className="text-xs font-medium text-ai hover:underline">Risk center</Link>}>
          {analytics.riskByEvent.length === 0 ? (
            <p className="text-sm text-secondary-text">No active events.</p>
          ) : (
            <div className="space-y-2">
              {analytics.riskByEvent.slice(0, 5).map((r) => (
                <Link key={r.id} href={`/secis/${r.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{r.name}</p>
                    <p className="text-xs text-secondary-text">{r.affected} entities affected</p>
                  </div>
                  <Badge variant={riskVariant(r.level as "low" | "medium" | "high")}>{r.level} · {r.score}</Badge>
                </Link>
              ))}
            </div>
          )}
        </SecisCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <SecisCard title="Evolution & recovery" description="Recovery throughput across recent runs." action={<Link href={"/secis/evolution" as Route} className="text-xs font-medium text-ai hover:underline">Evolution studio</Link>}>
          <OperationalBarChart values={recentRuns.length ? recentRuns.map((r) => r.result?.resilienceScore ?? 0).reverse() : [0]} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Completed</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.completedRuns}</p></div>
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Live</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.runningRuns}</p></div>
            <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Avg resilience</p><p className="mt-1 text-lg font-semibold text-primary-text">{analytics.avgResilience}</p></div>
          </div>
        </SecisCard>

        <SecisCard title="System overview" description="Systems in the graph." action={<Link href={"/secis/systems" as Route} className="text-xs font-medium text-ai hover:underline">Explore</Link>}>
          <div className="space-y-2">
            {systems.filter((s) => s.status === "active").map((s) => (
              <Link key={s.id} href={`/secis/systems` as Route} className="flex items-center justify-between rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                <span className="text-sm text-primary-text">{s.name}</span>
                <Badge variant={s.criticality >= 0.8 ? "danger" : s.criticality >= 0.6 ? "warning" : "secondary"}>crit {Math.round(s.criticality * 100)}</Badge>
              </Link>
            ))}
          </div>
        </SecisCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Recent change events" description="Latest authored events." action={<Link href={"/secis/change-events" as Route} className="text-xs font-medium text-ai hover:underline">All events</Link>}>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-secondary-text">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEvents.map((e) => {
                const Icon = EVENT_TYPE_ICON[e.type];
                return (
                  <Link key={e.id} href={`/secis/${e.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-md bg-slate-100"><Icon className="size-4 text-secondary-text" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary-text">{e.name}</p>
                        <p className="text-xs text-secondary-text">{WORKFLOW_META[e.workflowState].label} · {relativeTime(e.updatedAt)}</p>
                      </div>
                    </div>
                    <WorkflowBadge state={e.workflowState} />
                  </Link>
                );
              })}
            </div>
          )}
        </SecisCard>

        <SecisCard title="Recent runs" description="Latest evolution runs." action={<Link href={"/secis/evolution" as Route} className="text-xs font-medium text-ai hover:underline">Evolution</Link>}>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-secondary-text">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{r.name}</p>
                    <p className="text-xs text-secondary-text">{r.changeEventName} · {relativeTime(r.startedAt)}</p>
                  </div>
                  <RunStatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </SecisCard>
      </div>

      <SecisCard title="Top recommendations" description="Actions to mitigate and recover." action={<Link href={"/secis/recommendations" as Route} className="text-xs font-medium text-ai hover:underline">All</Link>}>
        {topRecs.length === 0 ? (
          <p className="text-sm text-secondary-text">Analyse an event to generate recommendations.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
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
      </SecisCard>

      <SecisCard title="Quick navigation">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavCard href="/secis/entities" label="Entity Explorer" icon={Boxes} />
          <NavCard href="/secis/change-events" label="Change Event Studio" icon={Zap} />
          <NavCard href="/secis/evolution" label="Evolution Studio" icon={Activity} />
          <NavCard href="/secis/compare" label="Comparison" icon={GitCompare} />
        </div>
      </SecisCard>
    </SecisShell>
  );
}
