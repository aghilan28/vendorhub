import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueAsyncJob, idempotencyKeyFor } from "@/lib/async/orchestrator";
import { AppError } from "@/lib/errors";
import { requireRole } from "@/lib/api/auth";

const ReconciliationSchema = z.object({
  batchSize: z.number().int().min(1).max(500).default(100),
  mode: z.enum(["async", "sync"]).default("async"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ReconciliationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid reconciliation request." }, { status: 400 });
    }

    await requireRole(["ADMIN", "SUPER_ADMIN"]);

    const result = await enqueueAsyncJob({
      name: "payment.reconciliation.run",
      payload: { batchSize: parsed.data.batchSize },
      idempotencyKey: idempotencyKeyFor(["payment-reconciliation", parsed.data.batchSize, new Date().toISOString().slice(0, 13)]),
      priority: "high",
    });
    return NextResponse.json({ accepted: true, durable: true, job: result }, { status: 202 });
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "AUTH_REQUIRED" ? 401 : error.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    return NextResponse.json({ error: "Financial reconciliation failed." }, { status: 500 });
  }
}
