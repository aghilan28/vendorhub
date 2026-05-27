import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limit";
import { recordServerPaymentVerification } from "@/lib/payments/orchestration";
import { recordOperationalEvent } from "@/lib/production/observability";

export async function POST(request: Request) {
  const rateLimit = checkPaymentRateLimit(`razorpay-verify:${request.headers.get("x-forwarded-for") ?? "local"}`, 12, 60_000);
  if (!rateLimit.allowed) {
    recordOperationalEvent("warn", "payment.rate_limit_triggered", { route: "razorpay-verify" }, { domain: "security" });
    return NextResponse.json({ verified: false, error: "Too many verification attempts. Please wait before retrying." }, { status: 429 });
  }

  try {
    const result = await recordServerPaymentVerification(await request.json());
    return NextResponse.json(result, { status: result.verified ? 200 : 400 });
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "VALIDATION_ERROR" ? 400 : error.code === "AUTH_REQUIRED" ? 401 : error.code === "FORBIDDEN" ? 403 : 500;
      recordOperationalEvent(status >= 500 ? "error" : "warn", "payment.verify_route.failed", { code: error.code, status }, { domain: "payment", error });
      return NextResponse.json({ verified: false, error: error.message, code: error.code }, { status });
    }

    recordOperationalEvent("error", "payment.verify_route.failed", { status: 500 }, { domain: "payment", error });
    return NextResponse.json({ verified: false, error: "Payment verification failed." }, { status: 500 });
  }
}
