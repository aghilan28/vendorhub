"use client";

// KARTEX M8.5 — Initiative Management
// Create, track, assign, measure progress, review results and close initiatives.

import { useState } from "react";
import { Plus, Rocket, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import { initiativeProgress, ownerName, programName } from "../helpers";
import { FormError, ProgressBar, StatusBadge, WorkflowControls } from "./shared";

export function InitiativeManagement() {
  const data = useExecutionStore((s) => s.data);
  const lastError = useExecutionStore((s) => s.lastError);
  const createInitiative = useExecutionStore((s) => s.createInitiative);
  const assignOwner = useExecutionStore((s) => s.assignOwner);
  const transitionEntity = useExecutionStore((s) => s.transitionEntity);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [programId, setProgramId] = useState("none");
  const [ownerId, setOwnerId] = useState("unassigned");

  const submit = () => {
    if (!name.trim()) return;
    const ok = createInitiative({
      name: name.trim(),
      description: description.trim(),
      programId: programId === "none" ? null : programId,
      ownerId: ownerId === "unassigned" ? null : ownerId,
    });
    if (ok) {
      setName("");
      setDescription("");
      setProgramId("none");
      setOwnerId("unassigned");
    }
  };

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Create initiative"
        description="Stand up a measurable initiative and attach it to a program."
        action={<Rocket className="size-4 text-secondary-text" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-secondary-text" htmlFor="ini-name">
              Name
            </label>
            <Input id="ini-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Trust Uplift" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-secondary-text" htmlFor="ini-desc">
              Description
            </label>
            <Textarea id="ini-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-secondary-text">Program</label>
            <Select value={programId} onValueChange={setProgramId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No program</SelectItem>
                {data.programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-secondary-text">Owner</label>
            <Select value={ownerId} onValueChange={setOwnerId}>
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
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={submit} disabled={!name.trim()}>
            <Plus className="size-4" /> Create initiative
          </Button>
          <FormError message={lastError} />
        </div>
      </GovernanceCard>

      <GovernanceCard
        title={`Initiatives (${data.initiatives.length})`}
        description="Track progress, assign owners, advance the lifecycle and close on completion."
      >
        <div className="space-y-3">
          {data.initiatives.map((initiative) => {
            const plans = data.actionPlans.filter((a) => initiative.actionPlanIds.includes(a.id));
            const kpis = data.kpis.filter((k) => initiative.kpiIds.includes(k.id));
            const outcomes = data.outcomes.filter((o) => o.initiativeId === initiative.id);
            return (
              <div key={initiative.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-primary-text">{initiative.name}</p>
                      <StatusBadge status={initiative.status} />
                      {initiative.decisionId ? <Badge variant="ai">decision-activated</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">
                      {initiative.code} · Program: {programName(data, initiative.programId)} · Owner:{" "}
                      {ownerName(data, initiative.ownerId)}
                    </p>
                    {initiative.description ? (
                      <p className="mt-1 text-sm text-secondary-text">{initiative.description}</p>
                    ) : null}
                  </div>
                  <div className="w-44">
                    <label className="text-xs font-medium text-secondary-text">Owner</label>
                    <Select
                      value={initiative.ownerId ?? "unassigned"}
                      onValueChange={(v) => assignOwner("initiative", initiative.id, v === "unassigned" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <ProgressBar value={initiativeProgress(initiative)} />
                  <span className="text-xs tabular-nums text-secondary-text">
                    {initiativeProgress(initiative)}%
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-secondary-text">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" /> {initiative.teamIds.length} team
                  </span>
                  <span>· {plans.length} action plans</span>
                  <span>· {kpis.length} KPIs</span>
                  <span>· {outcomes.length} outcomes</span>
                </div>

                <div className="mt-3 flex items-center justify-end">
                  <WorkflowControls
                    entityType="initiative"
                    entityId={initiative.id}
                    status={initiative.status}
                    onTransition={transitionEntity}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GovernanceCard>
    </div>
  );
}
