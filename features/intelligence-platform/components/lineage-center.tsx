"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ExternalLink, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { STAGE_META } from "@/lib/intelligence-platform";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { useHydrated } from "../hooks";
import { IntelShell, IntelCard } from "./primitives";
import { StageFlow } from "./stage-flow";
import { LineageGraph } from "./lineage-graph";
import { ListSkeleton } from "./skeletons";

export function LineageCenter() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const workflows = useIntelligenceStore((s) => s.workflows);
  const allNodes = useIntelligenceStore((s) => s.nodes);
  const [selected, setSelected] = useState(params.get("workflow") ?? workflows[0]?.id ?? "");

  if (!hydrated) return <ListSkeleton />;

  const workflow = workflows.find((w) => w.id === selected) ?? workflows[0];
  const nodes = workflow ? allNodes.filter((n) => n.workflowId === workflow.id) : [];

  return (
    <IntelShell
      title="Lineage Center"
      description="The central nervous system of KARTEX: trace any initiative from its research origin through knowledge, simulation, impact, and governance — end to end."
      actions={
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a workflow" /></SelectTrigger>
          <SelectContent>{workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      {!workflow ? (
        <EmptyState icon={GitBranch} title="No workflows yet" description="Create a workflow in the Workflow Center to see its lineage." />
      ) : (
        <>
          <IntelCard title={workflow.name} description={workflow.description}>
            <StageFlow workflow={workflow} />
          </IntelCard>

          <IntelCard title="Lineage graph" description="Research origin to governance decision. Click any node to open the underlying item.">
            <LineageGraph nodes={nodes} />
          </IntelCard>

          <IntelCard title="Cross-system references" description="Where each stage lives in the platform.">
            <div className="space-y-2">
              {workflow.stages.map((st) => {
                const meta = STAGE_META[st.stage];
                return (
                  <div key={st.stage} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{meta.label}: {st.label}</p><p className="text-xs text-secondary-text">{st.refId ? `Linked to ${st.refId}` : "Owned by the platform"}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={st.status === "complete" ? "default" : st.status === "blocked" ? "danger" : st.status === "in_progress" ? "ai" : "secondary"}>{st.status.replace("_", " ")}</Badge>
                      {st.refRoute ? <Link href={st.refRoute as Route} className="inline-flex items-center gap-1 text-xs font-medium text-ai hover:underline"><ExternalLink className="size-3" /> Open</Link> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </IntelCard>
        </>
      )}
    </IntelShell>
  );
}
