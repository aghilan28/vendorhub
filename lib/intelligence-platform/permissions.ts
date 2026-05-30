// KARTEX M6 — RBAC for the Intelligence Platform spine.

import type { Permission, PlatformRole, PlatformUser } from "./types";

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  orchestrator: ["workflow.manage", "workflow.advance", "node.create"],
  contributor: ["workflow.advance", "node.create"],
  viewer: [],
};

export function can(user: PlatformUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function roleLabel(role: PlatformRole): string {
  return { orchestrator: "Orchestrator", contributor: "Contributor", viewer: "Viewer" }[role];
}

export const ROLE_PERMISSION_MATRIX = ROLE_PERMISSIONS;
