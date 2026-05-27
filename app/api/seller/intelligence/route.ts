import { errorJson, okJson } from "@/lib/api/response";
import { getSellerOperationalSnapshot } from "@/lib/api/queries/seller";
import { performanceServerTiming, withCacheHeaders } from "@/lib/performance/api";
import { performanceBudgets } from "@/lib/performance/cache-policy";
import { recordOperationalEvent } from "@/lib/production/observability";

export async function GET() {
  const startedAt = Date.now();
  try {
    const snapshot = await getSellerOperationalSnapshot();
    const latencyMs = Date.now() - startedAt;
    recordOperationalEvent(
      latencyMs > performanceBudgets.apiP95Ms ? "warn" : "info",
      "merchant_intelligence.generated",
      {
        latencyMs,
        insightCount: snapshot.intelligence.insights.length,
        forecastCount: snapshot.intelligence.forecasts.length,
        overBudget: latencyMs > performanceBudgets.apiP95Ms,
      },
      { domain: "seller", durationMs: latencyMs },
    );

    const response = withCacheHeaders(okJson(snapshot.intelligence), "privateDashboard");
    response.headers.set("Server-Timing", performanceServerTiming("seller-intelligence", startedAt));
    return response;
  } catch (error) {
    return errorJson(error);
  }
}
