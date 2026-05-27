import { NextResponse } from "next/server";
import { z } from "zod";
import { runDurableEventProcessorOnce } from "@/lib/async/event-processor";
import { runAsyncWorkerOnce, runWorkerPoolOnce } from "@/lib/async/worker";
import { env } from "@/lib/env";

const WorkerRunSchema = z.object({
  queues: z.array(z.string().min(1)).max(8).optional(),
  pool: z.enum([
    "commerce-critical",
    "logistics-coordination",
    "ai-heavy-compute",
    "governance-risk",
    "analytics-bulk",
    "notification-delivery",
    "realtime-sync",
    "reconciliation-control",
  ]).optional(),
  mode: z.enum(["jobs", "events"]).default("jobs"),
  limit: z.number().int().min(1).max(50).default(10),
  workerId: z.string().min(3).max(120).optional(),
  gracefulShutdown: z.boolean().optional(),
});

function isAuthorized(request: Request) {
  const expected = env.cronSecret;
  if (!expected) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${expected}` || request.headers.get("x-cron-secret") === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Worker authorization required." }, { status: 401 });
  }

  const parsed = WorkerRunSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid worker run request." }, { status: 400 });
  }

  const result = parsed.data.mode === "events"
    ? await runDurableEventProcessorOnce({ workerId: parsed.data.workerId, limit: parsed.data.limit })
    : parsed.data.pool
      ? await runWorkerPoolOnce(parsed.data.pool, parsed.data)
      : await runAsyncWorkerOnce(parsed.data);
  return NextResponse.json({ data: result });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Worker authorization required." }, { status: 401 });
  }

  const result = await runAsyncWorkerOnce({
    queues: ["commerce-critical", "delivery", "ai-maintenance", "governance", "notifications", "analytics", "realtime"],
    limit: 20,
    workerId: "vercel-cron-phase31",
  });
  const events = await runDurableEventProcessorOnce({ workerId: "vercel-cron-phase31-events", limit: 20 });
  return NextResponse.json({ data: { jobs: result, events } });
}
