"use client";

// KARTEX M8.9 — KPI Center
// KPI registry, dashboards, tracking, alerts, trends and ownership.

import { useState } from "react";
import { BellRing, Gauge, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import { kpiAttainmentPct, kpiStatusTone, ownerName, programName } from "../helpers";
import { SectionGrid, Sparkline, Stat } from "./shared";

export function KpiCenter() {
  const data = useExecutionStore((s) => s.data);
  const snapshot = useExecutionStore((s) => s.snapshot);
  const measureKpi = useExecutionStore((s) => s.measureKpi);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const alerts = data.kpis.filter((k) => k.status !== "on_track");

  const submit = (kpiId: string) => {
    const raw = drafts[kpiId];
    if (raw === undefined || raw === "") return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    if (measureKpi(kpiId, value)) {
      setDrafts((prev) => ({ ...prev, [kpiId]: "" }));
    }
  };

  return (
    <div className="space-y-6">
      <GovernanceCard title="KPI performance" description="Aggregate attainment across the KPI registry." action={<Gauge className="size-4 text-secondary-text" />}>
        <SectionGrid cols={4}>
          <Stat label="Registered KPIs" value={snapshot.kpis.total} />
          <Stat label="On track" value={snapshot.kpis.onTrack} />
          <Stat label="At risk" value={snapshot.kpis.atRisk} tone={snapshot.kpis.atRisk > 0 ? "warning" : "default"} />
          <Stat label="Off track" value={snapshot.kpis.offTrack} tone={snapshot.kpis.offTrack > 0 ? "danger" : "default"} />
        </SectionGrid>
      </GovernanceCard>

      {alerts.length > 0 ? (
        <GovernanceCard title="KPI alerts" description="Indicators below tolerance, requiring attention or escalation." action={<BellRing className="size-4 text-amber-500" />}>
          <ul className="space-y-2">
            {alerts.map((kpi) => (
              <li key={kpi.id} className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                <span className="text-sm text-amber-800">{kpi.name}</span>
                <Badge variant={kpiStatusTone(kpi.status)}>{kpi.status.replace("_", " ")}</Badge>
              </li>
            ))}
          </ul>
        </GovernanceCard>
      ) : null}

      <GovernanceCard title="KPI registry" description="Track, measure and own every indicator." action={<Target className="size-4 text-blue-500" />}>
        <div className="space-y-3">
          {data.kpis.map((kpi) => (
            <div key={kpi.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-primary-text">{kpi.name}</p>
                    <Badge variant={kpiStatusTone(kpi.status)}>{kpi.status.replace("_", " ")}</Badge>
                    <Badge variant="secondary">{kpi.direction === "increase" ? "↑ higher better" : "↓ lower better"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">
                    {kpi.code} · Owner: {ownerName(data, kpi.ownerId)} · Program: {programName(data, kpi.programId)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums text-primary-text">
                    {kpi.current}
                    {kpi.unit}
                  </p>
                  <p className="text-xs text-secondary-text">
                    target {kpi.target}
                    {kpi.unit} · {kpiAttainmentPct(kpi)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-text">Trend</span>
                  <Sparkline values={kpi.trend} tone={kpi.status === "off_track" ? "stroke-red-500" : "stroke-blue-500"} />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    className="w-32"
                    placeholder="New value"
                    value={drafts[kpi.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [kpi.id]: e.target.value }))}
                    aria-label={`Measure ${kpi.name}`}
                  />
                  <Button size="sm" variant="secondary" onClick={() => submit(kpi.id)}>
                    Record
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GovernanceCard>
    </div>
  );
}
