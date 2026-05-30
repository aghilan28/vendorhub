import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the heavy async libs so we can certify the worker route's authorization
// and dispatch path in isolation (no Supabase required).
// vi.hoisted ensures the mock fns exist before the hoisted vi.mock factories run.
const { runAsyncWorkerOnce, runWorkerPoolOnce, runDurableEventProcessorOnce } = vi.hoisted(() => ({
  runAsyncWorkerOnce: vi.fn(async () => ({ processed: 3, failed: 0 })),
  runWorkerPoolOnce: vi.fn(async () => ({ processed: 1, failed: 0 })),
  runDurableEventProcessorOnce: vi.fn(async () => ({ processed: 2, failed: 0 })),
}));

vi.mock("@/lib/async/worker", () => ({ runAsyncWorkerOnce, runWorkerPoolOnce }));
vi.mock("@/lib/async/event-processor", () => ({ runDurableEventProcessorOnce }));
vi.mock("@/lib/env", () => ({ env: { cronSecret: "test-cron-secret" } }));

import { GET, POST } from "@/app/api/ops/async/worker/route";

beforeEach(() => {
  runAsyncWorkerOnce.mockClear();
  runWorkerPoolOnce.mockClear();
  runDurableEventProcessorOnce.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("worker route — authorization", () => {
  it("rejects unauthenticated GET with 401 and does not run processors", async () => {
    const response = await GET(new Request("https://x/api/worker"));
    expect(response.status).toBe(401);
    expect(runAsyncWorkerOnce).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated POST with 401", async () => {
    const response = await POST(new Request("https://x/api/worker", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
  });

  it("accepts the Vercel-cron Bearer token and dispatches jobs + events", async () => {
    const response = await GET(
      new Request("https://x/api/worker", { headers: { authorization: "Bearer test-cron-secret" } }),
    );
    expect(response.status).toBe(200);
    expect(runAsyncWorkerOnce).toHaveBeenCalledTimes(1);
    expect(runDurableEventProcessorOnce).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body.data.jobs).toMatchObject({ processed: 3 });
    expect(body.data.events).toMatchObject({ processed: 2 });
  });

  it("accepts the x-cron-secret header for POST and runs the requested mode", async () => {
    const response = await POST(
      new Request("https://x/api/worker", {
        method: "POST",
        headers: { "x-cron-secret": "test-cron-secret", "content-type": "application/json" },
        body: JSON.stringify({ mode: "events", limit: 5 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(runDurableEventProcessorOnce).toHaveBeenCalledTimes(1);
  });

  it("rejects a wrong secret", async () => {
    const response = await GET(
      new Request("https://x/api/worker", { headers: { authorization: "Bearer wrong" } }),
    );
    expect(response.status).toBe(401);
  });
});
