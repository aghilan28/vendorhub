import { NextResponse } from "next/server";
import { z } from "zod";
import { enqueueAsyncJob, idempotencyKeyFor } from "@/lib/async/orchestrator";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

const DeliveryReconciliationSchema = z.object({
  batchSize: z.number().int().min(1).max(500).default(100),
});

export async function POST(request: Request) {
  try {
    const parsed = DeliveryReconciliationSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid delivery reconciliation request." }, { status: 400 });
    }

    const result = await withSecurity(request, { name: "logistics.reconciliation.post", requireAuth: true, rateLimit: securityRateLimits.adminMutation, audit: true }, async (context) => {
      requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
      return enqueueAsyncJob({
        name: "delivery.reconciliation.run",
        payload: { batchSize: parsed.data.batchSize },
        idempotencyKey: idempotencyKeyFor(["delivery-reconciliation", parsed.data.batchSize, new Date().toISOString().slice(0, 13)]),
        priority: "high",
      });
    });

    return NextResponse.json({ accepted: true, durable: true, job: result }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delivery reconciliation failed." }, { status: 500 });
  }
}
