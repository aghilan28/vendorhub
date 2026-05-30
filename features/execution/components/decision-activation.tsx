"use client";

// KARTEX M8.11 — Decision Activation
// Convert governance/intelligence-approved decisions into executable
// initiatives + action plans with no manual re-entry:
// Decision → Action Plan → Initiative → Execution → Outcome.

import { useState } from "react";
import { ArrowRight, CheckCircle2, Workflow, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import { initiativeName, priorityTone } from "../helpers";
import { FormError } from "./shared";

const sourceLabels: Record<string, string> = {
  research: "Research",
  knowledge: "Knowledge",
  simulation: "Simulation",
  secis: "SECIS",
  governance: "Governance",
};

export function DecisionActivation() {
  const data = useExecutionStore((s) => s.data);
  const lastError = useExecutionStore((s) => s.lastError);
  const activateDecision = useExecutionStore((s) => s.activateDecision);
  const [owners, setOwners] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Decision activation flow"
        description="Approved intelligence becomes executable work automatically."
        action={<Workflow className="size-4 text-blue-500" />}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-secondary-text">
          {["Decision", "Action Plan", "Initiative", "Execution", "Outcome"].map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1">{step}</span>
              {index < 4 ? <ArrowRight className="size-3" /> : null}
            </span>
          ))}
        </div>
      </GovernanceCard>

      <GovernanceCard
        title="Decisions"
        description="Activate approved decisions; pending decisions await governance approval."
        action={<Zap className="size-4 text-amber-500" />}
      >
        <div className="space-y-3">
          {data.decisions.map((decision) => {
            const isActivated = decision.status === "activated";
            const isApproved = decision.status === "approved";
            return (
              <div key={decision.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-primary-text">{decision.title}</p>
                      <Badge variant="ai">{sourceLabels[decision.source] ?? decision.source}</Badge>
                      <Badge variant={priorityTone(decision.recommendedPriority)}>
                        {decision.recommendedPriority}
                      </Badge>
                      <Badge
                        variant={isActivated ? "default" : isApproved ? "secondary" : "warning"}
                      >
                        {decision.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-secondary-text">{decision.description}</p>
                    {isActivated && decision.activatedInitiativeId ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
                        <CheckCircle2 className="size-3" /> Activated into{" "}
                        {initiativeName(data, decision.activatedInitiativeId)}
                      </p>
                    ) : null}
                  </div>

                  {!isActivated ? (
                    <div className="flex items-end gap-2">
                      <div className="w-40">
                        <label className="text-xs font-medium text-secondary-text">Assign owner</label>
                        <Select
                          value={owners[decision.id] ?? "unassigned"}
                          onValueChange={(v) => setOwners((prev) => ({ ...prev, [decision.id]: v }))}
                          disabled={!isApproved}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {data.owners.map((owner) => (
                              <SelectItem key={owner.id} value={owner.id}>
                                {owner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        disabled={!isApproved}
                        onClick={() =>
                          activateDecision(
                            decision.id,
                            owners[decision.id] && owners[decision.id] !== "unassigned"
                              ? owners[decision.id]
                              : null,
                          )
                        }
                      >
                        <Zap className="size-4" /> Activate
                      </Button>
                    </div>
                  ) : null}
                </div>
                {!isApproved && !isActivated ? (
                  <p className="mt-2 text-xs text-amber-700">Awaiting governance approval before activation.</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <FormError message={lastError} />
        </div>
      </GovernanceCard>
    </div>
  );
}
