// KARTEX M7 — Workspace RBAC.

import type { Permission, WorkspaceRole, WorkspaceUser } from "./types";

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  lead: ["project.manage", "task.manage", "preferences.manage"],
  analyst: ["project.manage", "task.manage", "preferences.manage"],
  reviewer: ["task.manage", "preferences.manage"],
  viewer: ["preferences.manage"],
};

export function can(user: WorkspaceUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function roleLabel(role: WorkspaceRole): string {
  return { lead: "Lead", analyst: "Analyst", reviewer: "Reviewer", viewer: "Viewer" }[role];
}

export const ROLE_PERMISSION_MATRIX = ROLE_PERMISSIONS;
