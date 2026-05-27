"use client";

import { Activity, AlertTriangle, CheckCircle2, Clock, DatabaseZap, RadioTower, RefreshCw, ShieldAlert, Siren, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductionExperiencePanel } from "@/components/experience/production-experience-panel";
import { TrustStrip } from "@/components/experience/trust-strip";
import { AdminDashboardSkeleton } from "@/features/admin/components/loading";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useOperationsStore } from "@/store/operations-store";
import { useOperationalHealth } from "../queries";

const domainIcons = {
  checkout: Activity,
  payment: WalletCards,
  reconciliation: WalletCards,
  realtime: RadioTower,
  ai: Sparkles,
  database: DatabaseZap,
  delivery: Clock,
  admin: ShieldAlert,
  security: Siren,
  system: CheckCircle2,
} as const;

function toneVariant(tone: string) {
  if (tone === "critical" || tone === "degraded") return "danger";
  if (tone === "watch" || tone === "warning") return "warning";
  if (tone === "info") return "secondary";
  return "default";
}

function iconFor(domain: string) {
  return domainIcons[domain as keyof typeof domainIcons] ?? Activity;
}

export function PlatformHealthScreen() {
  const { data, error, isLoading, refetch, isFetching } = useOperationalHealth();
  const selectedDomain = useOperationsStore((state) => state.selectedDomain);
  const setSelectedDomain = useOperationsStore((state) => state.setSelectedDomain);

  if (error) {
    return (
      <GovernanceCard
        title="Operational health unavailable"
        description="The diagnostics endpoint failed before a health snapshot could be generated."
        action={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} aria-label="Retry operational health">
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Retry
          </Button>
        }
      >
        <div className="rounded-md border border-red-200 bg-red-50 p-4" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-700" aria-hidden="true" />
            <p className="font-medium text-red-800">Diagnostics fetch failed</p>
          </div>
          <p className="mt-2 text-sm text-red-700">{error instanceof Error ? error.message : "Operational health could not be loaded."}</p>
        </div>
      </GovernanceCard>
    );
  }

  if (isLoading || !data) return <AdminDashboardSkeleton />;

  const domains = ["all", ...data.systems.map((system) => system.domain)];
  const systems = selectedDomain === "all" ? data.systems : data.systems.filter((system) => system.domain === selectedDomain);
  const alerts = selectedDomain === "all" ? data.alerts : data.alerts.filter((alert) => alert.domain === selectedDomain);

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Operational health"
        description="Live production diagnostics across commerce, payment, realtime, AI, database, delivery, security, and governance signals."
        action={
          <Button variant="secondary" size="sm" onClick={() => void refetch()} aria-label="Refresh operational health">
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-md border border-border bg-slate-50 p-4" aria-live="polite">
            <Badge variant={toneVariant(data.overall.tone)}>{data.overall.label}</Badge>
            <p className="mt-3 text-2xl font-semibold text-primary-text">{data.alerts.filter((alert) => alert.severity !== "info").length} alerts</p>
            <p className="mt-1 text-sm text-secondary-text">{data.overall.detail}</p>
            <p className="mt-3 text-xs font-medium text-secondary-text">Updated {new Date(data.generatedAt).toLocaleString()}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(data.signals).slice(0, 8).map(([key, value]) => (
              <div key={key} className="rounded-md border border-border p-3">
                <p className="text-xs font-medium uppercase text-secondary-text">{key.replace(/([A-Z])/g, " $1")}</p>
                <p className="mt-2 text-xl font-semibold text-primary-text">{typeof value === "number" && value < 1 ? `${Math.round(value * 100)}%` : value}</p>
              </div>
            ))}
          </div>
        </div>
      </GovernanceCard>

      <ProductionExperiencePanel
        compact
        input={{
          persona: "admin",
          realtimeState: (data.signals.realtimeReconnects ?? 0) > 10 || (data.signals.activeRealtimeChannels ?? 0) > 80 ? "degraded" : "connected",
          aiAvailable: data.systems.find((system) => system.domain === "ai")?.tone !== "degraded",
          paymentRecoverable: data.alerts.some((alert) => alert.domain === "payment"),
          logisticsDelayed: data.alerts.some((alert) => alert.domain === "delivery"),
          operationalPressure: Math.min(100, data.alerts.filter((alert) => alert.severity !== "info").length * 15),
          accessibilityMode: true,
        }}
      />

      <TrustStrip
        label="Operational recovery and trust indicators"
        items={[
          { label: "Payments", value: data.systems.find((system) => system.domain === "payment")?.value ?? "Tracked", icon: WalletCards },
          { label: "Realtime", value: `${data.signals.realtimeReconnects ?? 0} reconnects`, icon: RadioTower },
          { label: "AI", value: data.systems.find((system) => system.domain === "ai")?.value ?? "Fallback ready", icon: Sparkles },
          { label: "Audit", value: data.audit.traceable ? "Traceable" : "Needs review", icon: ShieldAlert },
        ]}
      />

      <div className="flex flex-wrap gap-2" aria-label="Filter operational health domains">
        {domains.map((domain) => (
          <Button key={domain} variant={selectedDomain === domain ? "default" : "secondary"} size="sm" onClick={() => setSelectedDomain(domain)}>
            {domain}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GovernanceCard title="System visibility" description="Measurable health for the critical systems that can block orders, payments, fulfillment, and operations.">
          <div className="space-y-3" role="list" aria-label="Operational system statuses">
            {systems.map((system) => {
              const Icon = iconFor(system.domain);
              return (
                <div key={system.domain} className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between" role="listitem">
                  <div className="flex gap-3">
                    <Icon className="mt-0.5 size-4 text-secondary-text" aria-hidden="true" />
                    <div>
                      <p className="font-medium capitalize text-primary-text">{system.domain}</p>
                      <p className="mt-1 text-sm text-secondary-text">{system.detail}</p>
                    </div>
                  </div>
                  <Badge variant={toneVariant(system.tone)}>{system.value}</Badge>
                </div>
              );
            })}
          </div>
        </GovernanceCard>

        <GovernanceCard title="Actionable alerts" description="High-signal diagnostics with an operator action attached to every alert.">
          <div className="space-y-3" role="list" aria-label="Operational alerts">
            {alerts.map((alert) => {
              const Icon = alert.severity === "critical" ? Siren : alert.severity === "warning" ? AlertTriangle : CheckCircle2;
              return (
                <div key={alert.id} className="rounded-md border border-border p-3" role="listitem">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-secondary-text" aria-hidden="true" />
                      <p className="font-medium text-primary-text">{alert.title}</p>
                    </div>
                    <Badge variant={toneVariant(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium text-secondary-text">{alert.signal}</p>
                  <p className="mt-1 text-sm text-secondary-text">{alert.action}</p>
                </div>
              );
            })}
          </div>
        </GovernanceCard>
      </div>

      <GovernanceCard title="Audit trail posture" description="Critical action visibility remains timestamped, actor-linked, traceable, and immutable-aware.">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Audit events, 7d</p><p className="mt-2 font-semibold text-primary-text">{data.audit.last7d}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Actor-linked</p><p className="mt-2 font-semibold text-primary-text">{data.audit.actorLinked ? "Enabled" : "Missing"}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Traceable</p><p className="mt-2 font-semibold text-primary-text">{data.audit.traceable ? "Enabled" : "Missing"}</p></div>
          <div className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">Immutable-aware</p><p className="mt-2 font-semibold text-primary-text">{data.audit.immutableAware ? "Enabled" : "Missing"}</p></div>
        </div>
      </GovernanceCard>
    </div>
  );
}
