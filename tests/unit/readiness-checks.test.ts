import { afterEach, describe, expect, it, vi } from "vitest";
import { overallReadiness, type ReadinessCheck } from "@/lib/observability/readiness-checks";

vi.mock("@/lib/env", () => ({
  env: { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "anon-key" },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

const ok: ReadinessCheck = { name: "supabase", status: "ok", latencyMs: 12, detail: "" };
const unreachable: ReadinessCheck = { name: "supabase", status: "unreachable", latencyMs: 3000, detail: "" };
const notConfigured: ReadinessCheck = { name: "supabase", status: "not_configured", latencyMs: null, detail: "" };

describe("overallReadiness", () => {
  it("is ready only when all checks are ok", () => {
    expect(overallReadiness([ok])).toEqual({ ready: true, status: "ready" });
  });

  it("is not_ready when any dependency is unreachable", () => {
    expect(overallReadiness([unreachable])).toEqual({ ready: false, status: "not_ready" });
  });

  it("is degraded (not ready) when a dependency is merely unconfigured", () => {
    expect(overallReadiness([notConfigured])).toEqual({ ready: false, status: "degraded" });
  });

  it("prioritizes not_ready over degraded", () => {
    expect(overallReadiness([notConfigured, unreachable]).status).toBe("not_ready");
  });
});

describe("checkSupabaseConnectivity", () => {
  it("returns ok with latency when the health endpoint responds 200", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", { status: 200 })));
    const { checkSupabaseConnectivity } = await import("@/lib/observability/readiness-checks");
    const result = await checkSupabaseConnectivity();
    expect(result.status).toBe("ok");
    expect(result.latencyMs).not.toBeNull();
  });

  it("returns unreachable when the probe throws", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("network down");
    }));
    const { checkSupabaseConnectivity } = await import("@/lib/observability/readiness-checks");
    const result = await checkSupabaseConnectivity();
    expect(result.status).toBe("unreachable");
    expect(result.detail).toContain("network down");
  });
});
