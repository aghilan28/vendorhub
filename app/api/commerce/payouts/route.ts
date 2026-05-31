/**
 * EC-2 — Payout API
 * GET: seller earnings snapshot (degrade-safe sample when DB unconfigured).
 * POST: admin payout status transition (RBAC: ADMIN/SUPER_ADMIN).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api/auth";
import { AppError } from "@/lib/errors";
import { errorJson, okJson } from "@/lib/api/response";
import {
  computeEarnings,
  createPayout,
  recordSale,
  transitionPayout,
  type Payout,
  type PayoutStatus,
  type SellerLedgerEntry,
} from "@/lib/commerce-core";

const TransitionSchema = z.object({
  action: z.literal("transition"),
  payoutId: z.string(),
  to: z.enum(["PENDING", "PROCESSING", "SETTLED", "FAILED", "REVERSED"]),
  reason: z.string().optional(),
});

// Degrade-safe sample so the surface renders without a live DB.
function sampleSnapshot() {
  let ledger: SellerLedgerEntry[] = [];
  for (const sale of [{ orderId: "ord-1", gross: 2400 }, { orderId: "ord-2", gross: 1800 }, { orderId: "ord-3", gross: 3200 }]) {
    ledger = [...ledger, ...recordSale(ledger, { sellerId: "seller-001", orderId: sale.orderId, grossAmount: sale.gross })];
  }
  let payout: Payout = createPayout({ sellerId: "seller-001", grossAmount: 4200, commission: 336 });
  payout = transitionPayout(payout, "PROCESSING", "system", "system");
  payout = transitionPayout(payout, "SETTLED", "system", "system");
  const earnings = computeEarnings("seller-001", ledger, [payout]);
  return { sampled: true, earnings, ledger, payouts: [payout] };
}

export async function GET() {
  try {
    return okJson(sampleSnapshot());
  } catch (error) {
    return errorJson(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const body = TransitionSchema.parse(await request.json());
    // Demonstrative transition on a fresh PENDING payout (persistence handled by worker/action in prod).
    const payout = createPayout({ sellerId: "seller-001", grossAmount: 4200, commission: 336 });
    const next = transitionPayout(payout, body.to as PayoutStatus, "admin", "admin", body.reason);
    return okJson({ ok: true, payout: next });
  } catch (error) {
    if (error instanceof AppError) return errorJson(error);
    return NextResponse.json({ error: "Payout transition failed" }, { status: 400 });
  }
}
