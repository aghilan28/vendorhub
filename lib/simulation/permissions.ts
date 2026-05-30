// KARTEX M3 — RBAC and governance helpers for the Simulation OS.

import type { Permission, PlatformRole, Simulation, SimulationUser, Visibility } from "./types";

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  admin: [
    "simulation.create",
    "simulation.edit",
    "simulation.delete",
    "scenario.run",
    "review.submit",
    "approval.record",
    "decision.record",
    "settings.manage",
  ],
  analyst: ["simulation.create", "simulation.edit", "scenario.run", "decision.record"],
  reviewer: ["review.submit", "approval.record", "scenario.run"],
  viewer: [],
};

export function can(user: SimulationUser | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function roleLabel(role: PlatformRole): string {
  return { admin: "Administrator", analyst: "Analyst", reviewer: "Reviewer", viewer: "Viewer" }[role];
}

export function visibilityLabel(visibility: Visibility): string {
  return { private: "Private", team: "Team", organization: "Organization" }[visibility];
}

// Can a user see a given simulation given its visibility and ownership.
export function canView(user: SimulationUser | null | undefined, simulation: Simulation): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (simulation.ownerId === user.id) return true;
  if (simulation.contributors.some((c) => c.userId === user.id)) return true;
  return simulation.visibility !== "private";
}

export function canEdit(user: SimulationUser | null | undefined, simulation: Simulation): boolean {
  if (!user) return false;
  if (user.role === "viewer") return false;
  if (user.role === "admin") return true;
  if (simulation.ownerId === user.id) return true;
  return simulation.contributors.some((c) => c.userId === user.id && (c.role === "owner" || c.role === "editor"));
}

export const ROLE_PERMISSION_MATRIX = ROLE_PERMISSIONS;
