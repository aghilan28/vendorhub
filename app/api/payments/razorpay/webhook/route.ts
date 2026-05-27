import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { ingestRazorpayWebhook } from "@/lib/async/webhooks";
import { recordOperationalEvent } from "@/lib/production/observability";
import { validateWebhookTimestamp } from "@/lib/security/replay";
import { checkRateLimit, securityRateLimits } from "@/lib/security/rate-limit";
import { getRequestIp } from "@/lib/security/authorization";
import { verifyRazorpayWebhookSignature } from "@/features/commerce-finance/razorpay";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  const timestamp = request.headers.get("x-razorpay-event-timestamp") ?? request.headers.get("x-razorpay-timestamp");
  const rateLimit = checkRateLimit(`webhook:razorpay:${getRequestIp(request)}`, securityRateLimits.webhook);

  if (!rateLimit.allowed) {
    recordOperationalEvent("warn", "payment.webhook.rate_limited", { resetAt: rateLimit.resetAt }, { domain: "security" });
    return NextResponse.json({ error: "Webhook rate limit exceeded." }, { status: 429 });
  }

  if (timestamp) {
    const timestampCheck = validateWebhookTimestamp(timestamp);
    if (!timestampCheck.valid) {
      recordOperationalEvent("warn", "payment.webhook.timestamp_rejected", timestampCheck, { domain: "security" });
      return NextResponse.json({ error: "Webhook timestamp rejected." }, { status: 400 });
    }
  }

  try {
    const signatureValid = verifyRazorpayWebhookSignature(rawBody, signature);
    const result = await ingestRazorpayWebhook({ rawBody, signature, headers: request.headers, signatureValid });
    return NextResponse.json({ accepted: true, durable: true, ...result }, { status: result.duplicate ? 200 : 202 });
  } catch (error) {
    if (error instanceof AppError) {
      recordOperationalEvent(error.code === "VALIDATION_ERROR" ? "warn" : "error", "payment.webhook_route.failed", {
        code: error.code,
        bodyBytes: rawBody.length,
        hasSignature: Boolean(signature),
      }, { domain: error.code === "VALIDATION_ERROR" ? "security" : "reconciliation", error });
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "VALIDATION_ERROR" ? 400 : 500 });
    }

    recordOperationalEvent("error", "payment.webhook_route.failed", {
      bodyBytes: rawBody.length,
      hasSignature: Boolean(signature),
    }, { domain: "reconciliation", error });
    return NextResponse.json({ error: "Webhook reconciliation failed." }, { status: 500 });
  }
}
