"use client";

import { useEffect } from "react";
import { RUN_STAGES } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";

// Mounted once in the simulation layout. Advances any run with status
// "running" toward completion, emitting staged log lines, so the Execution
// Center shows a live, controllable run regardless of which route is open.
export function ExecutionRunner() {
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useSimulationStore.getState();
      for (const run of store.runs) {
        if (run.status !== "running" || run.progress >= 100) continue;
        const step = run.modelKey === "revenue_projection" ? 8 : 13;
        const next = Math.min(100, run.progress + step + Math.random() * 5);
        for (const stage of RUN_STAGES) {
          if (stage.at < 100 && stage.at > run.progress && stage.at <= next) {
            store.appendRunLog(run.id, stage.message);
          }
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
