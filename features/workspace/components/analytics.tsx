"use client";

import { BarChart3, CheckSquare, Stamp, Activity, FolderKanban } from "lucide-react";
import { useHydrated, useProductAnalytics } from "../hooks";
import { WorkspaceShell, WSCard, StatTile } from "./primitives";
import { HomeSkeleton } from "./skeletons";

function Bars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs"><span className="font-medium text-primary-text">{r.label}</span><span className="text-secondary-text">{r.value}</span></div>
          <div className="mt-1 h-2.5 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-brand" style={{ width: `${Math.max((r.value / max) * 100, 3)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function WorkspaceAnalytics() {
  const hydrated = useHydrated();
  const a = useProductAnalytics();
  if (!hydrated) return <HomeSkeleton />;

  return (
    <WorkspaceShell title="Product Analytics" description="How the platform is used: workflow completion, approval velocity, task throughput, and usage across every system.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Task completion" value={`${a.taskCompletion}%`} helper={`${a.openTasks} open of ${a.tasks}`} icon={CheckSquare} tone={a.taskCompletion >= 60 ? "success" : "warning"} />
        <StatTile label="Approval velocity" value={`${a.approvalVelocity}%`} helper="decisions resolved" icon={Stamp} tone={a.approvalVelocity >= 60 ? "success" : "warning"} />
        <StatTile label="Workflow completion" value={`${a.workflowCompletion}%`} helper="intelligence workflows" icon={Activity} tone="info" />
        <StatTile label="Active projects" value={String(a.activeProjects)} helper={`${a.projects} total`} icon={FolderKanban} tone="info" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Simulation usage" value={String(a.simulationUsage)} helper="runs" tone="neutral" />
        <StatTile label="Research usage" value={String(a.researchUsage)} helper="studies" tone="neutral" />
        <StatTile label="Knowledge usage" value={String(a.knowledgeUsage)} helper="assets" tone="neutral" />
        <StatTile label="Governance usage" value={String(a.governanceUsage)} helper="decisions + policies" tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <WSCard title="Usage by system" description="Activity volume across the five stages." action={<BarChart3 className="size-4 text-secondary-text" />}>
          <Bars rows={a.usageByStage} />
        </WSCard>
        <WSCard title="Engagement" description="Notifications and unread.">
          <Bars rows={[{ label: "Notifications", value: a.notifications }, { label: "Unread", value: a.unread }, { label: "Open tasks", value: a.openTasks }, { label: "Projects", value: a.projects }]} />
        </WSCard>
      </div>
    </WorkspaceShell>
  );
}
