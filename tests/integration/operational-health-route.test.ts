import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/operations/health/route";

vi.mock("@/lib/api/auth", () => ({
  requireRole: vi.fn(async () => undefined),
}));

vi.mock("@/lib/observability/operational-health", () => ({
  getOperationalHealthSnapshot: vi.fn(async () => ({
    service: "vendorhub-web",
    generatedAt: "2026-05-26T12:00:00.000Z",
    latencyMs: 12,
    overall: { tone: "healthy", label: "Healthy", detail: "No incidents" },
    signals: {},
    alerts: [],
    systems: [],
    audit: { last7d: 4, immutableAware: true, actorLinked: true, traceable: true },
  })),
}));

describe("operational health API contract", () => {
  it("wraps diagnostics snapshots in a correlated API envelope", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.service).toBe("vendorhub-web");
    expect(body.correlationId).toBeTruthy();
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });
});
