"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STAGE_META, type IntelligenceWorkflow } from "@/lib/intelligence-platform";
import { stageStatusVariant } from "../format";

// Horizontal Research -> Knowledge -> Simulation -> SECIS -> Governance pipeline.
export function StageFlow({ workflow, compact }: { workflow: IntelligenceWorkflow; compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
      {workflow.stages.map((st, i) => {
        const meta = STAGE_META[st.stage];
        const isCurrent = st.status === "in_progress" || st.status === "blocked";
        return (
          <div key={st.stage} className="flex flex-1 items-stretch gap-2">
            <div className={`flex-1 rounded-lg border p-3 ${isCurrent ? "border-2" : "border"}`} style={{ borderColor: isCurrent ? meta.color : undefined }}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-text">
                  <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: meta.color }} /> {meta.label}
                </span>
                <Badge variant={stageStatusVariant(st.status)}>{st.status.replace("_", " ")}</Badge>
              </div>
              {!compact ? <p className="mt-1.5 line-clamp-2 text-xs text-secondary-text">{st.label}</p> : null}
              {st.refRoute ? (
                <Link href={st.refRoute as Route} className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-ai hover:underline">
                  <ExternalLink className="size-3" /> Open in {meta.label}
                </Link>
              ) : null}
            </div>
            {i < workflow.stages.length - 1 ? <ArrowRight className="hidden self-center text-secondary-text lg:block" /> : null}
          </div>
        );
      })}
    </div>
  );
}
