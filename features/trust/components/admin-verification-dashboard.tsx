"use client";

import { AlertTriangle, ClipboardCheck, FileSearch, ShieldCheck, Store, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatting/currency";
import { useTrustStore } from "@/store/trust-store";
import { useKycProfiles, useTrustSummary, useVerificationQueue } from "../queries";
import { TrustLevelBadge, VerificationStateBadge } from "./trust-badges";

export function AdminVerificationDashboard() {
  const { data: profiles = [] } = useKycProfiles();
  const { data: queue = [] } = useVerificationQueue();
  const { data: summary } = useTrustSummary();
  const recordReview = useTrustStore((state) => state.recordReview);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase text-secondary-text">Trust command center</p>
            <h2 className="mt-1 text-xl font-semibold text-primary-text">Seller verification governance</h2>
            <p className="mt-2 text-sm text-secondary-text">Admin review for KYC documents, GST legitimacy, bank readiness, compliance flags, and seller restrictions.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric icon={UserCheck} label="Verified" value={summary.verifiedSellers} />
            <Metric icon={FileSearch} label="Pending" value={summary.pendingReviews} />
            <Metric icon={AlertTriangle} label="Open flags" value={summary.openFlags} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        {summary.trustDistribution.map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs text-secondary-text">{item.label.replaceAll("_", " ")}</p>
            <p className="mt-2 text-2xl font-semibold text-primary-text">{item.count}</p>
          </div>
        ))}
      </div>

      {queue.length ? (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold text-primary-text"><ClipboardCheck className="size-4" /> Pending verification queue</h3>
          <div className="mt-4 grid gap-4">
            {queue.map((profile) => (
              <article key={profile.sellerId} className="rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-primary-text">{profile.businessName}</p>
                    <p className="mt-1 text-sm text-secondary-text">{profile.ownerName} · {profile.city} · {profile.gst.gstin ?? "GST pending"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <VerificationStateBadge state={profile.verificationState} />
                      <TrustLevelBadge level={profile.trustScore.level} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => recordReview(profile.sellerId, "approved", "Documents, GST, and bank proof approved for marketplace operations.")}><ShieldCheck /> Approve</Button>
                    <Button size="sm" variant="secondary" onClick={() => recordReview(profile.sellerId, "resubmission_required", "Address proof and business name need seller resubmission.")}>Resubmit</Button>
                    <Button size="sm" variant="destructive" onClick={() => recordReview(profile.sellerId, "suspended", "Temporary restriction applied pending compliance escalation.")}>Suspend</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-secondary-text">Documents</p>
                    <p className="mt-1 font-semibold text-primary-text">{profile.documents.filter((document) => document.status === "approved").length}/{profile.documents.length} approved</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-secondary-text">Payout readiness</p>
                    <p className="mt-1 font-semibold text-primary-text">{profile.bank.payoutReadiness}</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-secondary-text">Estimated exposure</p>
                    <p className="mt-1 font-semibold text-primary-text">{formatCurrency(profile.vendor.orderCount ? Math.min(profile.vendor.orderCount * 42, 850000) : 0)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  {profile.documents.map((document) => (
                    <div key={document.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-primary-text">{document.label}</span>
                      <span className="text-secondary-text">{document.status.replaceAll("_", " ")} · {document.privateStoragePath ? "private storage" : "upload pending"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState icon={ShieldCheck} title="No pending reviews" description="Verification submissions, resubmissions, and suspended seller reviews will appear here." />
      )}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h3 className="flex items-center gap-2 font-semibold text-primary-text"><Store className="size-4" /> Seller legitimacy overview</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-secondary-text">
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Seller</th>
                <th className="py-2 pr-4">Verification</th>
                <th className="py-2 pr-4">Trust</th>
                <th className="py-2 pr-4">GST</th>
                <th className="py-2 pr-4">Bank</th>
                <th className="py-2 pr-4">Flags</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.sellerId} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4"><p className="font-medium text-primary-text">{profile.businessName}</p><p className="text-xs text-secondary-text">{profile.ownerName}</p></td>
                  <td className="py-3 pr-4"><VerificationStateBadge state={profile.verificationState} /></td>
                  <td className="py-3 pr-4"><TrustLevelBadge level={profile.trustScore.level} /></td>
                  <td className="py-3 pr-4">{profile.gst.status.replaceAll("_", " ")}</td>
                  <td className="py-3 pr-4">{profile.bank.payoutReadiness}</td>
                  <td className="py-3 pr-4">{profile.flags.filter((flag) => flag.status !== "resolved").length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-secondary-text"><Icon className="size-3.5" /> {label}</div>
      <p className="mt-1 font-semibold text-primary-text">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}
