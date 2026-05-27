import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limit";
import { createLiveRazorpayOrder } from "@/lib/payments/orchestration";
import { recordOperationalEvent } from "@/lib/production/observability";

export async function POST(request: Request) {
  const rateLimit = checkPaymentRateLimit(`razorpay-order:${request.headers.get("x-forwarded-for") ?? "local"}`, 8, 60_000);
  if (!rateLimit.allowed) {
    recordOperationalEvent("warn", "payment.rate_limit_triggered", { route: "razorpay-order" }, { domain: "security" });
    return NextResponse.json({ error: "Too many payment attempts. Please wait before retrying." }, { status: 429 });
  }

  try {
    const result = await createLiveRazorpayOrder(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "VALIDATION_ERROR" ? 400 : error.code === "AUTH_REQUIRED" ? 401 : error.code === "FORBIDDEN" ? 403 : 500;
      recordOperationalEvent(status >= 500 ? "error" : "warn", "payment.order_route.failed", { code: error.code, status }, { domain: "payment", error });
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    recordOperationalEvent("error", "payment.order_route.failed", { status: 500 }, { domain: "payment", error });
    return NextResponse.json({ error: "Live Razorpay order creation failed." }, { status: 500 });
  }
}
