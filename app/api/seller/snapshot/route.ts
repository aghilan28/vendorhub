import { errorJson, okJson } from "@/lib/api/response";
import { getSellerOperationalSnapshot } from "@/lib/api/queries/seller";
import { performanceServerTiming, withCacheHeaders } from "@/lib/performance/api";

export async function GET() {
  const startedAt = Date.now();
  try {
    const snapshot = await getSellerOperationalSnapshot();
    const response = withCacheHeaders(okJson(snapshot), "privateDashboard");
    response.headers.set("Server-Timing", performanceServerTiming("seller-snapshot", startedAt));
    return response;
  } catch (error) {
    return errorJson(error);
  }
}
