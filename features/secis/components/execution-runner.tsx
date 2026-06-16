"use client";

import { useEffect } from "react";
import { RUN_STAGES } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";

// Mounted once in the SECIS layout. Advances any evolution run that is
// "running" toward completion across every route, emitting staged logs.
export function ExecutionRunner() {
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useSecisStore.getState();
      for (const run of store.evolutionRuns) {
        if (run.status !== "running" || run.progress >= 100) continue;
        const next = Math.min(100, run.progress + 14 + Math.random() * 6);
        for (const stage of RUN_STAGES) {
          if (stage.at < 100 && stage.at > run.progress && stage.at <= next) store.appendRunLog(run.id, stage.message);
        }
        if (next >= 100) {
          store.setRunProgress(run.id, 100);
          store.completeRun(run.id);
        } else {
          store.setRunProgress(run.id, next);
        }
      }
    }, 520);
    return () => clearInterval(interval);
  }, []);
  return null;
}
