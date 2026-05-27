"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { recordOperationalEvent } from "@/lib/production/observability";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    recordOperationalEvent("error", "frontend.render_crash", {
      digest: error.digest ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : "unknown",
    }, { domain: "frontend", error });
  }, [error]);

  return (
    <PageContainer>
      <ErrorState
        title="VendorHub recovered the experience shell"
        description="This failure was contained before exposing raw infrastructure details. Retry safely; transactions, fulfillment, and audit trails remain server-authoritative."
      />
      <div className="mt-4 flex justify-center">
        <Button onClick={reset}>Retry safely</Button>
      </div>
    </PageContainer>
  );
}
