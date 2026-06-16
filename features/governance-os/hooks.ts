"use client";

import { useEffect, useMemo, useState } from "react";
import { useGovernanceStore } from "@/store/governance-store";
import { can, computeCompliance, controlCoverage, generateRecommendations, type GovernanceDashboard, type GovernanceRecommendation, type Permission } from "@/lib/governance-os";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCurrentUser() {
  return useGovernanceStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return can(user, permission);
}

export function useGovernanceDashboard(): GovernanceDashboard {
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);
  const exceptions = useGovernanceStore((s) => s.exceptions);
  const risks = useGovernanceStore((s) => s.risks);
  const checks = useGovernanceStore((s) => s.checks);
  const audit = useGovernanceStore((s) => s.audit);

  return useMemo(() => {
    const compliance = computeCompliance(checks);
    return {
      policies: policies.filter((p) => p.status !== "archived").length,
      publishedPolicies: policies.filter((p) => p.status === "published").length,
      draftPolicies: policies.filter((p) => p.status === "draft").length,
      decisions: decisions.filter((d) => d.status !== "archived").length,
      pendingReviews: decisions.filter((d) => d.status === "review").length,
      pendingApprovals: decisions.filter((d) => d.status === "review").length + policies.filter((p) => p.status === "review" || p.status === "approved").length,
      pendingExceptions: exceptions.filter((e) => e.status === "requested" || e.status === "review").length,
      openRisks: risks.filter((r) => r.status === "open" || r.status === "mitigating").length,
      criticalRisks: risks.filter((r) => r.severity === "critical").length,
      complianceScore: compliance.score,
      controlCoverage: controlCoverage(policies),
      auditEvents: audit.length,
    };
  }, [policies, decisions, exceptions, risks, checks, audit]);
}

export function useRecommendations(): GovernanceRecommendation[] {
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);
  const risks = useGovernanceStore((s) => s.risks);
  const checks = useGovernanceStore((s) => s.checks);
  const exceptions = useGovernanceStore((s) => s.exceptions);
  const accepted = useGovernanceStore((s) => s.acceptedRecommendationIds);

  return useMemo(() => {
    // Recommendations are derived deterministically; identify accepted ones by a stable key.
    const recs = generateRecommendations({ policies, decisions, risks, checks, exceptions });
    return recs.map((r) => ({ ...r, id: `${r.kind}:${r.objectId ?? r.title}` })).filter((r) => !accepted.includes(r.id));
  }, [policies, decisions, risks, checks, exceptions, accepted]);
}
