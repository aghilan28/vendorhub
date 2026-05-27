import { NextResponse } from "next/server";
import { httpCachePolicy } from "./cache-policy";

export function withCacheHeaders<T>(response: NextResponse<T>, policy: keyof typeof httpCachePolicy) {
  response.headers.set("Cache-Control", httpCachePolicy[policy]);
  response.headers.set("Vary", "Authorization, Cookie");
  return response;
}

export function performanceServerTiming(name: string, startedAt: number) {
  return `${name};dur=${Math.max(0, Date.now() - startedAt)}`;
}
