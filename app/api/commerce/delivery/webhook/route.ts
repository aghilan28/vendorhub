/**
 * EC-2 — Delivery Provider Webhook
 * Normalizes inbound provider status payloads into shipment transitions.
 * Rate-limited; idempotent (duplicate/illegal transitions are rejected without error).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limit";
import { createShipment, processWebhook, type Shipment } from "@/lib/commerce-core";

const WebhookSchema = z.object({
  orderId: z.string(),
  provider: z.enum(["shiprocket", "delhivery", "porter", "local"]),
  status: z.string(),
  location: z.string().optional(),
  note: z.string().optional(),
  awb: z.string().optional(),
  // Optional prior shipment state for stateless processing demonstration.
  currentStatus: z.string().optional(),
});

export async function POST(request: Request) {
  const rl = checkPaymentRateLimit(`delivery-webhook:${request.headers.get("x-forwarded-for") ?? "local"}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = WebhookSchema.parse(await request.json());
    // In production the shipment is loaded from DB; here we reconstruct a baseline for processing.
    let shipment: Shipment = createShipment({
      orderId: body.orderId,
      provider: body.provider,
      pickupPincode: "560001",
      dropPincode: "560100",
      weightKg: 1,
      codAmount: 0,
    });
    if (body.currentStatus) {
      shipment = { ...shipment, status: body.currentStatus as Shipment["status"] };
    }
    const result = processWebhook(shipment, { status: body.status, location: body.location, note: body.note, awb: body.awb });
    return NextResponse.json({ applied: result.applied, reason: result.reason, status: result.shipment.status });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
