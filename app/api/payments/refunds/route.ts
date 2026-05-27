import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { checkPaymentRateLimit } from "@/lib/payments/rate-limit";
import { requestAndInitiateRefund } from "@/lib/payments/orchestration";

export async function POST(request: Request) {
  const rateLimit = checkPaymentRateLimit(`refund:${request.headers.get("x-forwarded-for") ?? "local"}`, 6, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many refund attempts. Please wait before retrying." }, { status: 429 });
  }

  try {
    const result = await requestAndInitiateRefund(await request.json());
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      const status = error.code === "VALIDATION_ERROR" ? 400 : error.code === "AUTH_REQUIRED" ? 401 : error.code === "FORBIDDEN" ? 403 : 500;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    return NextResponse.json({ error: "Refund orchestration failed." }, { status: 500 });
  }
}
