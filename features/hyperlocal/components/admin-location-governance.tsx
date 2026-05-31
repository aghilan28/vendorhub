"use client";

// MCP-1C Phase 11 — Admin Location Governance Center.
// Delivery network, zone/coverage dashboards and hyperlocal intelligence
// (coverage gaps, demand hotspots, expansion).

import { Activity, BarChart3, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { AdminLocationSnapshot, Severity, Tone } from "@/lib/hyperlocal";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneBadge: Record<Tone, "default" | "warning" | "danger"> = { healthy: "default", watch: "warning", degraded: "warning", critical: "danger" };
const cellBadge: Record<string, "default" | "secondary" | "warning" | "danger" | "ai"> = { covered: "default", thin: "warning", gap: "danger", hotspot: "ai" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function AdminLocationGovernance({ snapshot, sampled }: { snapshot: AdminLocationSnapshot; sampled: boolean }) {
  const { network, intelligence } = snapshot;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><MapPin className="size-5" /> Location Governance</h1>
          <p className="text-sm text-secondary-text">Govern marketplace geography: coverage, zones, delivery and expansion.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Stores" value={String(snapshot.stores)} />
        <Stat label="Network health" value={`${network.health}`} tone={network.tone === "critical" ? "danger" : network.tone === "healthy" ? undefined : "warning"} />
        <Stat label="Utilization" value={`${network.utilization}%`} tone={network.utilization >= 90 ? "warning" : undefined} />
        <Stat label="Coverage" value={`${snapshot.coverageRate}%`} />
        <Stat label="Overloaded zones" value={String(network.overloadedZones)} tone={network.overloadedZones ? "danger" : undefined} />
      </div>

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <GovernanceCard title="Delivery network" description={`${network.serviceableZones} serviceable zones · ${network.totalOrders}/${network.totalCapacity} orders.`} action={<Truck className="size-4 text-secondary-text" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-secondary-text">
                  <tr><th className="py-2 pr-3">Zone</th><th className="py-2 pr-3">Stores</th><th className="py-2 pr-3">Utilization</th><th className="py-2 pr-3">On-time</th><th className="py-2 pr-3">Courier</th></tr>
                </thead>
                <tbody>
                  {network.zones.map((z) => (
                    <tr key={z.id} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium text-primary-text">{z.name}</td>
                      <td className="py-2 pr-3 text-secondary-text">{z.stores}</td>
                      <td className="py-2 pr-3"><Badge variant={toneBadge[z.tone]}>{z.utilization}%</Badge></td>
                      <td className="py-2 pr-3 text-secondary-text">{z.onTimeRate}%</td>
                      <td className="py-2 pr-3 text-secondary-text">{z.courier ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="coverage">
          <GovernanceCard title="Marketplace coverage" description={`${intelligence.serviceablePincodes}/${intelligence.totalPincodes} pincodes covered · ${intelligence.coverageGaps} gaps · ${intelligence.demandHotspots} hotspots.`} action={<BarChart3 className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {intelligence.cells.map((cell) => (
                <div key={cell.pincode} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <span className="text-primary-text">{cell.pincode} · {cell.city ?? ""}</span>
                  <span className="flex items-center gap-2 text-secondary-text">{cell.stores} stores · demand {cell.demand} <Badge variant={cellBadge[cell.status]}>{cell.status}</Badge></span>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="intelligence">
          <GovernanceCard title="Hyperlocal intelligence" description="Coverage gaps, hotspots, expansion and zone risks." action={<Activity className="size-4 text-secondary-text" />}>
            {intelligence.recommendations.length ? (
              <ul className="space-y-2">
                {intelligence.recommendations.map((r) => (
                  <li key={r.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[r.severity]}>{r.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{r.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{r.detail}</p>
                    <p className="mt-1 text-xs font-medium text-brand">{r.action}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No location recommendations right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
