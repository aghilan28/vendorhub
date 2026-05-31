"use client";

// MCP-1D Phase 10 — Admin Growth Operations (admin surface).
// Customer / growth / campaign / retention / referral / loyalty / engagement /
// marketplace-demand / growth-intelligence dashboards + customer operations.

import { Activity, BarChart3, Megaphone, Users, Sparkles, TrendingUp, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import type { AdminGrowthSnapshot, LoyaltyTier, Severity, Tone } from "@/lib/customer-growth";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};
const toneBadge: Record<Tone, "default" | "warning" | "danger"> = { healthy: "default", watch: "warning", degraded: "warning", critical: "danger" };
const tierLabel: Record<LoyaltyTier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warning" | "danger" }) {
  const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

export function AdminGrowthOperations({ snapshot, sampled }: { snapshot: AdminGrowthSnapshot; sampled: boolean }) {
  const { intelligence, engagement } = snapshot;
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><TrendingUp className="size-5" /> Growth Operations</h1>
          <p className="text-sm text-secondary-text">Manage marketplace demand: customers, retention, loyalty, referrals, campaigns and growth intelligence.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Customers" value={snapshot.customers.toLocaleString("en-IN")} />
        <Stat label="Active" value={String(snapshot.activeCustomers)} />
        <Stat label="At risk" value={String(snapshot.atRiskCustomers)} tone={snapshot.atRiskCustomers ? "warning" : undefined} />
        <Stat label="Retention" value={`${snapshot.retentionRate}%`} tone={snapshot.retentionRate < 65 ? "danger" : snapshot.retentionRate < 80 ? "warning" : undefined} />
        <Stat label="30d demand" value={`~${snapshot.demandForecast}`} />
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
        </TabsList>

        {/* Customer + segment dashboard */}
        <TabsContent value="customers">
          <GovernanceCard title="Customer segments" description={`${snapshot.customers} customers · ${snapshot.newCustomers} new.`} action={<Users className="size-4 text-secondary-text" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-secondary-text">
                  <tr><th className="py-2 pr-3">Segment</th><th className="py-2 pr-3">Customers</th><th className="py-2 pr-3">Share</th><th className="py-2 pr-3">Revenue</th><th className="py-2 pr-3">Avg value</th><th className="py-2 pr-3">Churn risk</th></tr>
                </thead>
                <tbody>
                  {snapshot.segments.map((s) => (
                    <tr key={s.segment} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium text-primary-text">{s.segment.replace(/_/g, " ")}</td>
                      <td className="py-2 pr-3 text-secondary-text">{s.customers}</td>
                      <td className="py-2 pr-3 text-secondary-text">{s.share}%</td>
                      <td className="py-2 pr-3 text-secondary-text">₹{s.revenue.toLocaleString("en-IN")}</td>
                      <td className="py-2 pr-3 text-secondary-text">{s.avgValueScore}</td>
                      <td className="py-2 pr-3"><Badge variant={s.churnRisk >= 66 ? "danger" : s.churnRisk >= 33 ? "warning" : "default"}>{s.churnRisk}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Retention / churn */}
        <TabsContent value="retention">
          <GovernanceCard title="Retention & churn" description={`${intelligence.churnRisks} high-risk · ${intelligence.retentionRisks} watch.`} action={<Activity className="size-4 text-secondary-text" />}>
            {intelligence.churn.length ? (
              <ul className="space-y-2">
                {intelligence.churn.slice(0, 10).map((c) => (
                  <li key={c.customerId} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-primary-text">{c.name}</span>
                      <Badge variant={c.band === "high" ? "danger" : c.band === "medium" ? "warning" : "default"}>{c.band} · {c.churnRisk}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{c.drivers.join(", ")}</p>
                    <p className="mt-1 text-xs font-medium text-brand">{c.retentionAction}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No churn signals.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        {/* Loyalty distribution */}
        <TabsContent value="loyalty">
          <GovernanceCard title="Loyalty program" description={`${snapshot.loyaltyMembers} members across tiers.`} action={<Gift className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {snapshot.tierDistribution.map((t) => (
                <Stat key={t.tier} label={tierLabel[t.tier]} value={String(t.customers)} />
              ))}
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Referral dashboard */}
        <TabsContent value="referrals">
          <GovernanceCard title="Referral program" description={`${snapshot.referral.total} referrals · ${snapshot.referral.conversionRate}% conversion.`} action={<Users className="size-4 text-secondary-text" />}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total" value={String(snapshot.referral.total)} />
              <Stat label="Rewarded" value={String(snapshot.referral.rewarded)} />
              <Stat label="Flagged" value={String(snapshot.referral.flagged)} tone={snapshot.referral.flagged ? "danger" : undefined} />
              <Stat label="Conversion" value={`${snapshot.referral.conversionRate}%`} />
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Campaign dashboard */}
        <TabsContent value="campaigns">
          <GovernanceCard title="Campaigns" description={`${snapshot.campaigns.filter((c) => c.status === "active").length} active · ${snapshot.campaigns.length} total.`} action={<Megaphone className="size-4 text-secondary-text" />}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-secondary-text">
                  <tr><th className="py-2 pr-3">Campaign</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Schedule</th><th className="py-2 pr-3">CTR</th><th className="py-2 pr-3">ROAS</th><th className="py-2 pr-3">Revenue</th></tr>
                </thead>
                <tbody>
                  {snapshot.campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="py-2 pr-3 font-medium text-primary-text">
                        {c.name}
                        {!c.validation.valid ? <span className="ml-1 text-xs text-red-600">(invalid)</span> : null}
                      </td>
                      <td className="py-2 pr-3 text-secondary-text">{c.type}</td>
                      <td className="py-2 pr-3"><Badge variant={toneBadge[c.tone]}>{c.status}</Badge></td>
                      <td className="py-2 pr-3 text-secondary-text">{c.scheduledLabel}</td>
                      <td className="py-2 pr-3 text-secondary-text">{c.ctr}%</td>
                      <td className="py-2 pr-3 text-secondary-text">{c.roas}×</td>
                      <td className="py-2 pr-3 text-secondary-text">₹{c.revenue.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Engagement dashboard */}
        <TabsContent value="engagement">
          <GovernanceCard title="Engagement" description={`${engagement.sent} sent · ${engagement.openRate}% open · ${engagement.clickRate}% click.`} action={<Sparkles className="size-4 text-secondary-text" />}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Delivery" value={`${engagement.deliveryRate}%`} tone={engagement.deliveryRate < 80 ? "warning" : undefined} />
                <Stat label="Open rate" value={`${engagement.openRate}%`} />
                <Stat label="Click rate" value={`${engagement.clickRate}%`} />
                <Stat label="Sent" value={String(engagement.sent)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-secondary-text">
                    <tr><th className="py-2 pr-3">Channel</th><th className="py-2 pr-3">Sent</th><th className="py-2 pr-3">Open rate</th></tr>
                  </thead>
                  <tbody>
                    {engagement.byChannel.map((ch) => (
                      <tr key={ch.channel} className="border-t border-border">
                        <td className="py-2 pr-3 font-medium text-primary-text">{ch.channel.replace(/_/g, "-")}</td>
                        <td className="py-2 pr-3 text-secondary-text">{ch.sent}</td>
                        <td className="py-2 pr-3 text-secondary-text">{ch.openRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Growth intelligence */}
        <TabsContent value="intelligence">
          <GovernanceCard
            title="Growth intelligence"
            description={`${intelligence.growthOpportunities} opportunities · demand forecast ~${intelligence.demandForecast} orders/30d.`}
            action={<BarChart3 className="size-4 text-secondary-text" />}
          >
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
              <p className="text-sm text-secondary-text">No growth recommendations right now.</p>
            )}
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
