"use client";

// MCP-1D Phase 9 — Customer Growth Center (buyer surface).
// Reward status, referral status, campaigns, saved items, recommendations,
// growth opportunities, personalized insights, loyalty + journey dashboards.

import { useMemo, useState } from "react";
import { Gift, Sparkles, Users, Megaphone, Compass, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { redeemReward, type CustomerGrowthSnapshot, type LoyaltyTier, type RewardRedemptionOption, type Severity } from "@/lib/customer-growth";

const sevBadge: Record<Severity, "default" | "secondary" | "warning" | "danger" | "ai"> = {
  info: "secondary",
  opportunity: "ai",
  watch: "ai",
  warning: "warning",
  critical: "danger",
};

const tierBadge: Record<LoyaltyTier, "default" | "secondary" | "warning" | "ai"> = {
  bronze: "secondary",
  silver: "default",
  gold: "warning",
  platinum: "ai",
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="operational-surface rounded-lg p-4">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary-text">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-secondary-text">{hint}</p> : null}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function CustomerGrowthCenter({ snapshot, sampled }: { snapshot: CustomerGrowthSnapshot; sampled: boolean }) {
  const { identity, loyalty, referral, personalization, recommendations, engagement, activeCampaigns, opportunities } = snapshot;
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const redeemable = useMemo(() => loyalty.redeemable, [loyalty.redeemable]);

  function onRedeem(option: RewardRedemptionOption) {
    const result = redeemReward(option, { customerId: identity.customerId, pointsBalance: loyalty.pointsBalance, tier: loyalty.tier });
    setRedeemMsg(result.reason);
  }

  function onCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(referral.code.link).then(() => setCopied(true)).catch(() => setCopied(false));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><Gift className="size-5" /> Your Rewards & Growth</h1>
          <p className="text-sm text-secondary-text">Loyalty, referrals, offers and recommendations — all the value you get from VendorHub.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Loyalty tier" value={loyalty.tier.charAt(0).toUpperCase() + loyalty.tier.slice(1)} hint={loyalty.nextTier ? `${loyalty.pointsToNextTier} pts to ${loyalty.nextTier}` : "Top tier"} />
        <Stat label="Points balance" value={loyalty.pointsBalance.toLocaleString("en-IN")} hint={loyalty.pointsExpiringSoon ? `${loyalty.pointsExpiringSoon} expiring soon` : "No expiry soon"} />
        <Stat label="Referrals rewarded" value={String(referral.rewarded)} hint={`${referral.pointsEarned} pts earned`} />
        <Stat label="Profile complete" value={`${identity.completion.score}%`} hint={identity.completion.nextBestField ? `Add ${identity.completion.nextBestField}` : "All set"} />
      </div>

      <Tabs defaultValue="loyalty">
        <TabsList>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="foryou">For you</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
        </TabsList>

        {/* Loyalty dashboard */}
        <TabsContent value="loyalty">
          <GovernanceCard
            title="Loyalty dashboard"
            description={`${loyalty.tier} tier · ${loyalty.pointsEarnedLifetime.toLocaleString("en-IN")} lifetime points.`}
            action={<Badge variant={tierBadge[loyalty.tier]}>{loyalty.tier}</Badge>}
          >
            <div className="space-y-4">
              {loyalty.nextTier ? (
                <div>
                  <div className="flex items-center justify-between text-xs text-secondary-text">
                    <span>Progress to {loyalty.nextTier}</span>
                    <span>{loyalty.tierProgress}%</span>
                  </div>
                  <div className="mt-1"><ProgressBar value={loyalty.tierProgress} /></div>
                  <p className="mt-1 text-xs text-secondary-text">{loyalty.pointsToNextTier} points to go.</p>
                </div>
              ) : (
                <p className="text-sm text-emerald-700">You&apos;re at the top Platinum tier — enjoy every perk.</p>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase text-secondary-text">Your perks</p>
                <ul className="flex flex-wrap gap-2">
                  {loyalty.perks.map((perk) => (
                    <li key={perk}><Badge variant="secondary">{perk}</Badge></li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase text-secondary-text">Redeem points ({loyalty.pointsBalance.toLocaleString("en-IN")} available)</p>
                <div className="space-y-2">
                  {redeemable.map((option) => {
                    const affordable = loyalty.pointsBalance >= option.pointsCost;
                    return (
                      <div key={option.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                        <div>
                          <p className="text-sm font-medium text-primary-text">{option.label}</p>
                          <p className="text-xs text-secondary-text">{option.pointsCost.toLocaleString("en-IN")} pts · worth {option.valueLabel}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRedeem(option)}
                          disabled={!affordable}
                          className={`focus-ring rounded-md px-3 py-1.5 text-sm transition-colors ${affordable ? "bg-brand text-white" : "cursor-not-allowed bg-slate-100 text-secondary-text"}`}
                        >
                          Redeem
                        </button>
                      </div>
                    );
                  })}
                </div>
                {redeemMsg ? <p className="mt-2 text-xs font-medium text-brand">{redeemMsg}</p> : null}
              </div>
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Referral status */}
        <TabsContent value="referrals">
          <GovernanceCard title="Refer friends, earn points" description="Share your link. When a friend places their first qualifying order, you both win." action={<Users className="size-4 text-secondary-text" />}>
            <div className="space-y-4">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-secondary-text">Your referral code</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-primary-text">{referral.code.code}</span>
                  <button type="button" onClick={onCopy} className="focus-ring rounded-md bg-brand px-3 py-1.5 text-sm text-white">{copied ? "Copied!" : "Copy link"}</button>
                </div>
                <p className="mt-1 break-all text-xs text-secondary-text">{referral.code.link}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Total invites" value={String(referral.total)} />
                <Stat label="Pending" value={String(referral.pending)} />
                <Stat label="Rewarded" value={String(referral.rewarded)} />
                <Stat label="Conversion" value={`${referral.conversionRate}%`} />
              </div>
              {referral.flagged ? <p className="text-xs text-amber-700">{referral.flagged} referral(s) under fraud review.</p> : null}
            </div>
          </GovernanceCard>
        </TabsContent>

        {/* Campaigns / offers */}
        <TabsContent value="offers">
          <GovernanceCard title="Offers for you" description="Active campaigns you're eligible for." action={<Megaphone className="size-4 text-secondary-text" />}>
            {activeCampaigns.length ? (
              <ul className="space-y-2">
                {activeCampaigns.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-primary-text">{c.name}</p>
                      <p className="text-xs text-secondary-text">{c.type} · {c.scheduledLabel}</p>
                    </div>
                    <Badge variant="ai">{c.type}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-text">No active offers for you right now — check back soon.</p>
            )}
          </GovernanceCard>
        </TabsContent>

        {/* Recommendations + personalization */}
        <TabsContent value="foryou">
          <div className="space-y-4">
            <GovernanceCard title="Recommended for you" description={`${recommendations.items.length} picks · ${recommendations.coverage}% recommendation coverage.`} action={<Compass className="size-4 text-secondary-text" />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {recommendations.items.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary-text">{item.title}</p>
                      {item.price ? <span className="text-sm text-secondary-text">₹{item.price.toLocaleString("en-IN")}</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{item.reason}</p>
                    <Badge variant="secondary" className="mt-1">{item.kind.replace(/_/g, " ")}</Badge>
                  </div>
                ))}
              </div>
            </GovernanceCard>

            <GovernanceCard title="Your interests" description={`Personalization score ${personalization.personalizationScore}/100.`} action={<Sparkles className="size-4 text-secondary-text" />}>
              <div className="flex flex-wrap gap-2">
                {personalization.topInterests.length ? (
                  personalization.topInterests.map((interest) => <Badge key={interest} variant="ai">{interest}</Badge>)
                ) : (
                  <p className="text-sm text-secondary-text">Browse and shop to personalize your experience.</p>
                )}
              </div>
            </GovernanceCard>
          </div>
        </TabsContent>

        {/* Activity feed + opportunities */}
        <TabsContent value="activity">
          <div className="space-y-4">
            <GovernanceCard title="Recent activity" description="Your alerts and updates.">
              {engagement.length ? (
                <ul className="space-y-2">
                  {engagement.map((m) => (
                    <li key={m.id} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={m.read ? "secondary" : "ai"}>{m.kind.replace(/_/g, " ")}</Badge>
                        <span className="text-sm font-medium text-primary-text">{m.title}</span>
                        <span className="text-xs text-secondary-text">· {m.daysAgo}d ago</span>
                      </div>
                      <p className="mt-1 text-xs text-secondary-text">{m.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary-text">No recent activity.</p>
              )}
            </GovernanceCard>

            <GovernanceCard title="Growth opportunities" description="Personalized ways to get more value." action={<TrendingUp className="size-4 text-secondary-text" />}>
              {opportunities.length ? (
                <ul className="space-y-2">
                  {opportunities.map((o) => (
                    <li key={o.id} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={sevBadge[o.severity]}>{o.kind.replace(/_/g, " ")}</Badge>
                        <span className="text-sm font-medium text-primary-text">{o.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-secondary-text">{o.detail}</p>
                      <p className="mt-1 text-xs font-medium text-brand">{o.action}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary-text">You&apos;re getting the most from VendorHub. Keep it up!</p>
              )}
            </GovernanceCard>
          </div>
        </TabsContent>

        {/* Journey dashboard */}
        <TabsContent value="journey">
          <GovernanceCard title="Your VendorHub journey" description="Where you are and what's next." action={<Trophy className="size-4 text-secondary-text" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Lifecycle" value={identity.lifecycle.replace(/_/g, " ")} />
                <Stat label="Segment" value={identity.segment.replace(/_/g, " ")} />
                <Stat label="Value score" value={`${identity.valueScore}/100`} />
                <Stat label="Account health" value={`${identity.accountHealth}/100`} />
              </div>
              <ul className="space-y-1 text-sm text-secondary-text">
                {snapshot.briefing.map((line, i) => (
                  <li key={i} className="flex gap-2"><span className="text-brand">•</span> {line}</li>
                ))}
              </ul>
              {identity.trustIndicators.length ? (
                <div className="flex flex-wrap gap-2">
                  {identity.trustIndicators.map((t) => <Badge key={t} variant="default">{t}</Badge>)}
                </div>
              ) : null}
            </div>
          </GovernanceCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
