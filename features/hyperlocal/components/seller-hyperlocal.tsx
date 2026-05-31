"use client";

// MCP-1C Phase 10 — Seller Hyperlocal Operations.
// Coverage, delivery radius, delivery health, zone analytics, territory/coverage
// opportunities and a daily hyperlocal briefing.

import { Activity, Gauge, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { SellerHyperlocalSnapshot, Severity, Tone } from "@/lib/hyperlocal";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneBadge: Record<Tone, "default" | "warning" | "danger"> = { healthy: "default", watch: "warning", degraded: "warning", critical: "danger" };

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <Icon className="size-4 text-secondary-text" />
      <p className="mt-2 text-xs text-secondary-text">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

export function SellerHyperlocal({ snapshot, sampled }: { snapshot: SellerHyperlocalSnapshot; sampled: boolean }) {
  const { coverage } = snapshot;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><MapPin className="size-5" /> Hyperlocal Operations</h1>
          <p className="text-sm text-secondary-text">{snapshot.name} · manage your delivery territory.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Stat label="Service radius" value={`${coverage.serviceRadiusKm} km`} icon={MapPin} />
        <Stat label="Coverage area" value={`${coverage.coverageAreaSqKm} km²`} icon={MapPin} />
        <Stat label="Capacity used" value={`${coverage.utilization}%`} icon={Gauge} />
        <Stat label="Delivery health" value={`${snapshot.deliveryHealth}`} icon={Activity} />
        <Stat label="Zones" value={String(coverage.zones.length)} icon={Truck} />
      </div>

      <Tabs defaultValue="zones">
        <TabsList>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
        </TabsList>

        <TabsContent value="zones">
          <GovernanceCard title="Zone analytics" description="Delivery zones serving your territory.">
            <div className="space-y-2">
              {snapshot.zones.map((zone) => (
                <div key={zone.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-primary-text">{zone.name}</p>
                    <p className="text-xs text-secondary-text">{zone.stores} stores · {zone.ordersToday}/{zone.capacityPerDay} orders · {zone.courier ?? "no courier"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={toneBadge[zone.tone]}>{zone.utilization}% used</Badge>
                    <p className="mt-1 text-xs text-secondary-text">on-time {zone.onTimeRate}%</p>
                  </div>
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="opportunities">
          <GovernanceCard title="Territory & coverage opportunities" action={<Activity className="size-4 text-secondary-text" />}>
            {snapshot.alerts.length ? (
              <ul className="space-y-2">
                {snapshot.alerts.map((a) => (
                  <li key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[a.severity]}>{a.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{a.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{a.detail}</p>
                    <p className="mt-1 text-xs font-medium text-brand">{a.action}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No territory opportunities right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="briefing">
          <GovernanceCard title="Daily hyperlocal briefing" action={<Activity className="size-4 text-secondary-text" />}>
            <ul className="space-y-1.5 text-sm text-secondary-text">
              {snapshot.briefing.map((line, i) => (
                <li key={i}>• {line}</li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
