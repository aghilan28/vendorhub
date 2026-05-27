"use client";

import { useEffect } from "react";
import { recordOperationalEvent } from "@/lib/production/observability";

export function FrontendTelemetry() {
  useEffect(() => {
    const reportNavigation = () => {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return;

      recordOperationalEvent("info", "frontend.navigation_timing", {
        path: window.location.pathname,
        loadMs: Math.round(navigation.loadEventEnd),
        domInteractiveMs: Math.round(navigation.domInteractive),
        transferSize: navigation.transferSize,
        effectiveType: "connection" in navigator ? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType ?? "unknown" : "unknown",
      }, { domain: "frontend" });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordOperationalEvent("error", "frontend.unhandled_rejection", {
        path: window.location.pathname,
      }, { domain: "frontend", error: event.reason });
    };

    const onError = (event: ErrorEvent) => {
      recordOperationalEvent("error", "frontend.runtime_error", {
        path: window.location.pathname,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, { domain: "frontend", error: event.error ?? event.message });
    };

    const onOffline = () => recordOperationalEvent("warn", "frontend.offline", { path: window.location.pathname }, { domain: "frontend" });
    const onOnline = () => recordOperationalEvent("info", "frontend.online", { path: window.location.pathname }, { domain: "frontend" });

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    setTimeout(reportNavigation, 0);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
