// KARTEX M4 — RBAC for the SECIS platform.

import type { Permission, PlatformRole, SecisUser, Visibility } from "./types";

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  admin: ["entity.manage", "system.manage", "event.create", "event.run", "decision.record", "mitigation.apply", "approval.record", "settings.manage"],
  analyst: ["entity.manage", "system.manage", "event.create", "event.run", "decision.record", "mitigation.apply"],
  operator: ["event.run", "mitigation.apply", "approval.record"],
  viewer: [],
};

export function can(user: SecisUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function roleLabel(role: PlatformRole): string {
  return { admin: "Administrator", analyst: "Analyst", operator: "Operator", viewer: "Viewer" }[role];
}

export function visibilityLabel(v: Visibility): string {
  return { private: "Private", team: "Team", organization: "Organization" }[v];
}

export const ROLE_PERMISSION_MATRIX = ROLE_PERMISSIONS;
