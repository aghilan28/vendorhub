// KARTEX M5 — RBAC for the Governance OS.

import type { Permission, PlatformRole, GovernanceUser, Visibility } from "./types";

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  governance_admin: ["policy.manage", "policy.approve", "decision.create", "decision.review", "decision.approve", "risk.manage", "exception.request", "exception.approve", "report.generate", "settings.manage"],
  policy_owner: ["policy.manage", "decision.create", "risk.manage", "exception.request", "report.generate"],
  reviewer: ["decision.review", "exception.request", "report.generate"],
  approver: ["policy.approve", "decision.approve", "exception.approve", "decision.review", "report.generate"],
  auditor: ["report.generate"],
  viewer: [],
};

export function can(user: GovernanceUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function roleLabel(role: PlatformRole): string {
  return {
    governance_admin: "Governance Admin",
    policy_owner: "Policy Owner",
    reviewer: "Reviewer",
    approver: "Approver",
    auditor: "Auditor",
    viewer: "Viewer",
  }[role];
}

export function visibilityLabel(v: Visibility): string {
  return { private: "Private", team: "Team", organization: "Organization" }[v];
}

export const ROLE_PERMISSION_MATRIX = ROLE_PERMISSIONS;
