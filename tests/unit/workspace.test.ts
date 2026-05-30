import { describe, expect, it } from "vitest";
import { REF_SYSTEMS, SYSTEM_META, can, roleLabel, uid, type WorkspaceUser } from "@/lib/workspace";

describe("workspace — system metadata", () => {
  it("defines metadata for every referenced system", () => {
    for (const sys of REF_SYSTEMS) {
      expect(SYSTEM_META[sys]).toBeDefined();
      expect(SYSTEM_META[sys].label.length).toBeGreaterThan(0);
      expect(SYSTEM_META[sys].route.startsWith("/")).toBe(true);
      expect(SYSTEM_META[sys].color.startsWith("#")).toBe(true);
    }
  });

  it("covers the five lifecycle systems plus the intelligence spine", () => {
    expect(REF_SYSTEMS).toEqual(["research", "knowledge", "simulation", "secis", "governance", "intelligence"]);
  });
});

describe("workspace — RBAC", () => {
  const lead: WorkspaceUser = { id: "1", name: "Lead", role: "lead" };
  const reviewer: WorkspaceUser = { id: "2", name: "Rev", role: "reviewer" };
  const viewer: WorkspaceUser = { id: "3", name: "View", role: "viewer" };

  it("enforces project/task permissions per role", () => {
    expect(can(lead, "project.manage")).toBe(true);
    expect(can(reviewer, "project.manage")).toBe(false);
    expect(can(reviewer, "task.manage")).toBe(true);
    expect(can(viewer, "task.manage")).toBe(false);
    expect(can(viewer, "preferences.manage")).toBe(true);
    expect(can(null, "project.manage")).toBe(false);
  });

  it("labels roles", () => {
    expect(roleLabel("lead")).toBe("Lead");
    expect(roleLabel("viewer")).toBe("Viewer");
  });
});

describe("workspace — ids", () => {
  it("generates unique prefixed ids", () => {
    const a = uid("prj");
    const b = uid("prj");
    expect(a).not.toEqual(b);
    expect(a.startsWith("prj_")).toBe(true);
  });
});
