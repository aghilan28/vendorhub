"use client";

// MCP-0D.12 — Admin Trust Governance Center.
// Rich per-entity views run on a deterministic engine over a labelled sample;
// real governance counts (when Supabase is configured) are shown alongside.

import { useMemo } from "react";
import { AlertTriangle, BadgeCheck, Brain, MessageSquareWarning, RotateCcw, ShieldCheck, Star, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { buildTrustSnapshot, SAMPLE_TRUST_INPUT } from "@/lib/trust";
import type { TrustGovernanceCounts } from "@/lib/trust/queries";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" | "ai" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "ai" ? "text-blue-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

const sevTone: Record<string, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};

const tierTone: Record<string, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  top_rated: "default",
  established: "ai",
  rising: "secondary",
  new: "secondary",
  restricted: "danger",
};

export function AdminTrustCenter({ counts }: { counts: TrustGovernanceCounts }) {
  const snap = useMemo(() => buildTrustSnapshot(SAMPLE_TRUST_INPUT), []);
  const g = snap.governance;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Trust Governance Center</h1>
          <p className="text-sm text-secondary-text">Marketplace trust, abuse & fraud detection, returns/refunds, reputation, disputes and support.</p>
        </div>
        <Badge variant={counts.configured ? "default" : "warning"}>{counts.configured ? "Live counts" : "Preview (sample data)"}</Badge>
      </div>

      {counts.configured ? (
        <GovernanceCard title="Live marketplace trust (real data)" description="Counts from reviews, disputes, refunds and trust scores." action={<ShieldCheck className="size-4 text-secondary-text" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Reviews" value={String(counts.reviews)} />
            <Stat label="Flagged reviews" value={String(counts.flaggedReviews)} tone={counts.flaggedReviews ? "warning" : undefined} />
            <Stat label="Disputes" value={String(counts.openDisputes)} tone={counts.openDisputes ? "warning" : undefined} />
            <Stat label="Refund requests" value={String(counts.openRefunds)} />
            <Stat label="Trusted sellers" value={String(counts.trustedSellers)} />
          </div>
        </GovernanceCard>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Marketplace trust" value={`${g.marketplaceTrustScore}/100`} tone="ai" />
        <Stat label="Flagged reviews" value={String(g.flaggedReviews)} tone={g.flaggedReviews ? "warning" : undefined} />
        <Stat label="Open disputes" value={String(g.openDisputes)} tone={g.openDisputes ? "warning" : undefined} />
        <Stat label="At-risk sellers" value={String(g.atRiskSellers)} tone={g.atRiskSellers ? "danger" : undefined} />
      </div>

      <Tabs defaultValue="reputation">
        <TabsList>
          <TabsTrigger value="reputation">Reputation</TabsTrigger>
          <TabsTrigger value="returns">Returns / Refunds</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          <TabsTrigger value="intelligence">Trust Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="reputation">
          <GovernanceCard title="Seller reputation" description="Operational reputation from real fulfilment, returns, refunds and reviews." action={<BadgeCheck className="size-4 text-secondary-text" />}>
            <div className="space-y-2">
              {snap.sellerReputations.map((r) => (
                <div key={r.sellerId} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary-text">{r.name}</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={tierTone[r.tier]}>{r.tier.replace("_", " ")}</Badge>
                      <Badge variant={r.score >= 70 ? "default" : "warning"}>{r.score}/100</Badge>
                      {r.verified ? <Badge variant="ai">verified</Badge> : null}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">
                    Fulfilment {r.fulfillmentQuality}% · returns {r.returnRate}% · refunds {r.refundRate}% · satisfaction {r.satisfaction}% · response {r.responseTimeMinutes}m
                  </p>
                  {r.badges.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.badges.map((b) => (
                        <Badge key={b} variant="secondary"><Star className="size-3" /> {b}</Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="returns">
          <div className="grid gap-4 lg:grid-cols-2">
            <GovernanceCard title="Returns" description="Open return cases requiring action." action={<RotateCcw className="size-4 text-secondary-text" />}>
              <Stat label="Open returns" value={String(g.openReturns)} tone={g.openReturns ? "warning" : undefined} />
              <p className="mt-2 text-xs text-secondary-text">Buyer → request/track/evidence; Seller → review/approve/reject; Admin → intervene/audit. Lifecycle enforced by the returns state machine.</p>
            </GovernanceCard>
            <GovernanceCard title="Refunds & disputes" description="Open refunds and dispute arbitration." action={<Wallet className="size-4 text-secondary-text" />}>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Open refunds" value={String(g.openRefunds)} />
                <Stat label="Open disputes" value={String(g.openDisputes)} tone={g.openDisputes ? "warning" : undefined} />
              </div>
            </GovernanceCard>
          </div>
        </TabsContent>

        <TabsContent value="support">
          <GovernanceCard title="Support operations" description="Ticket queue, SLA and category mix." action={<MessageSquareWarning className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Open tickets" value={String(snap.support.open)} />
              <Stat label="Urgent" value={String(snap.support.urgent)} tone={snap.support.urgent ? "danger" : undefined} />
              <Stat label="Avg first response" value={`${snap.support.avgFirstResponseMinutes}m`} />
              <Stat label="SLA breaches" value={String(snap.support.slaBreaches)} tone={snap.support.slaBreaches ? "warning" : undefined} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {snap.support.byCategory.map((c) => (
                <Badge key={c.category} variant="secondary">{c.category}: {c.count}</Badge>
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        <TabsContent value="intelligence">
          <GovernanceCard title="Trust intelligence" description="Fraud, abuse and risk detection on marketplace activity." action={<Brain className="size-4 text-blue-500" />}>
            <ul className="space-y-2">
              {snap.insights.map((i, idx) => (
                <li key={`${i.kind}-${idx}`} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={sevTone[i.severity]}>{i.kind.replace(/_/g, " ")}</Badge>
                    <span className="text-sm font-medium text-primary-text">{i.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{i.detail}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand"><AlertTriangle className="size-3" /> {i.action}</p>
                </li>
              ))}
            </ul>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
