"use client";

// MCP-1A Phase 7 — Admin Seller Governance Center.
// Six review queues (seller review / store approval / verification / catalog
// approval / risk / escalation), marketplace health and seller summary counts.

import { Activity, ShieldAlert, Store, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { ActivationRecommendation, SellerGovernanceSnapshot, Severity } from "@/lib/seller-activation";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function SellerGovernanceCenter({
  snapshot,
  recommendations,
  sampled,
}: {
  snapshot: SellerGovernanceSnapshot;
  recommendations: ActivationRecommendation[];
  sampled: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><Users className="size-5" /> Seller Governance Center</h1>
          <p className="text-sm text-secondary-text">Review, verify, approve and monitor sellers at scale.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Sellers" value={String(snapshot.sellers)} />
        <Stat label="Active" value={String(snapshot.activeSellers)} />
        <Stat label="Pending verification" value={String(snapshot.pendingVerification)} tone={snapshot.pendingVerification ? "warning" : undefined} />
        <Stat label="Flagged" value={String(snapshot.flaggedSellers)} tone={snapshot.flaggedSellers ? "danger" : undefined} />
        <Stat label="Marketplace health" value={`${snapshot.marketplaceHealth}`} tone={snapshot.tone === "critical" ? "danger" : snapshot.tone === "healthy" ? undefined : "warning"} />
      </div>

      <Tabs defaultValue={snapshot.queues[0]?.kind ?? "seller_review"}>
        <TabsList>
          {snapshot.queues.map((q) => (
            <TabsTrigger key={q.kind} value={q.kind}>
              {q.label} ({q.items.length})
            </TabsTrigger>
          ))}
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        {snapshot.queues.map((queue) => (
          <TabsContent key={queue.kind} value={queue.kind}>
            <GovernanceCard title={queue.label} description={`${queue.items.length} item(s) in this queue.`} action={<Store className="size-4 text-secondary-text" />}>
              {queue.items.length ? (
                <ul className="space-y-2">
                  {queue.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={sevBadge[item.severity]}>{item.severity}</Badge>
                          <span className="text-sm font-medium text-primary-text">{item.sellerName}</span>
                          <span className="text-xs text-secondary-text">{item.ageHours}h ago</span>
                        </div>
                        <p className="mt-1 text-xs text-secondary-text">{item.summary}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-brand">Review</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary-text">Queue is clear.</p>
              )}
            </GovernanceCard>
          </TabsContent>
        ))}

        <TabsContent value="intelligence">
          <GovernanceCard title="Seller intelligence" description="Marketplace population and expansion recommendations." action={<ShieldAlert className="size-4 text-secondary-text" />}>
            {recommendations.length ? (
              <ul className="space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={sevBadge[rec.severity]}>{rec.kind.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-medium text-primary-text">{rec.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{rec.detail}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><Activity className="size-3" /> {rec.action}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No recommendations right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
