"use client";

// MCP-1A Phase 6 — Seller Activation Center.
// Shows onboarding/verification/catalog/store-health/trust status, the
// next-best-action task list and the daily briefing. Engine-driven.

import Link from "next/link";
import { Activity, BadgeCheck, Boxes, ClipboardCheck, Gauge, Rocket, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { SellerActivationSnapshot, Severity } from "@/lib/seller-activation";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <Icon className="size-4 text-secondary-text" />
      <p className="mt-2 text-xs text-secondary-text">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-primary-text">{value}</p>
    </div>
  );
}

export function SellerActivationCenter({ snapshot, sampled }: { snapshot: SellerActivationSnapshot; sampled: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><Rocket className="size-5" /> Activation Center</h1>
          <p className="text-sm text-secondary-text">{snapshot.storeName} · know exactly what to do next.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : `Stage: ${snapshot.stage.replace(/_/g, " ")}`}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Activation" value={`${snapshot.activationScore}`} icon={Gauge} />
        <Stat label="Onboarding" value={`${snapshot.onboarding.percent}%`} icon={ClipboardCheck} />
        <Stat label="Verification" value={`${snapshot.verification.passed}/${snapshot.verification.total}`} icon={BadgeCheck} />
        <Stat label="Catalog" value={`${snapshot.catalog.published}/${snapshot.catalog.products}`} icon={Boxes} />
        <Stat label="Store health" value={`${snapshot.storeHealth}`} icon={Activity} />
        <Stat label="Trust" value={`${snapshot.trustScore}`} icon={ShieldCheck} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <GovernanceCard title="Action center" description="Your next best actions, ranked by impact.">
          {snapshot.tasks.length ? (
            <ul className="space-y-2">
              {snapshot.tasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[task.severity]}>{task.severity}</Badge>
                      <span className="text-sm font-medium text-primary-text">{task.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{task.detail}</p>
                  </div>
                  <Link href={task.href} className="shrink-0 text-xs font-medium text-brand">Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-secondary-text">You&apos;re all set — no pending actions.</p>
          )}
        </GovernanceCard>

        <GovernanceCard title="Daily briefing" action={<Activity className="size-4 text-secondary-text" />}>
          <ul className="space-y-1.5 text-sm text-secondary-text">
            {snapshot.briefing.map((line, i) => (
              <li key={i}>• {line}</li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 text-xs">
            <Link href="/seller/import" className="block font-medium text-brand">→ Import products</Link>
            <Link href="/seller/intelligence" className="block font-medium text-brand">→ View intelligence</Link>
            <Link href="/seller/fulfillment" className="block font-medium text-brand">→ Fulfil orders</Link>
          </div>
        </GovernanceCard>
      </div>
    </div>
  );
}
