"use client";

// KARTEX M8.4 — Action Plan Center
// Create action plans, assign owners/deadlines/priorities, link intelligence
// (research, knowledge, simulation, SECIS, governance) and track execution.

import { useState } from "react";
import { ClipboardList, Link2, Plus } from "lucide-react";
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
import { PRIORITIES, type Priority } from "@/lib/execution";
import { useExecutionStore } from "../store";
import { initiativeName, ownerName, priorityTone } from "../helpers";
import { FormError, ProgressBar, StatusBadge, WorkflowControls } from "./shared";

export function ActionPlanCenter() {
  const data = useExecutionStore((s) => s.data);
  const lastError = useExecutionStore((s) => s.lastError);
  const createActionPlan = useExecutionStore((s) => s.createActionPlan);
  const assignOwner = useExecutionStore((s) => s.assignOwner);
  const transitionEntity = useExecutionStore((s) => s.transitionEntity);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [ownerId, setOwnerId] = useState<string>("unassigned");
  const [initiativeId, setInitiativeId] = useState<string>("none");
  const [deadline, setDeadline] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    const created = createActionPlan({
      title: title.trim(),
      description: description.trim(),
      priority,
      ownerId: ownerId === "unassigned" ? null : ownerId,
      initiativeId: initiativeId === "none" ? null : initiativeId,
      deadline: deadline || undefined,
    });
    if (created) {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setOwnerId("unassigned");
      setInitiativeId("none");
      setDeadline("");
    }
  };

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Create action plan"
        description="Turn an insight or decision into an owned, scheduled, prioritised plan."
        action={<ClipboardList className="size-4 text-secondary-text" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-secondary-text" htmlFor="ap-title">
              Title
            </label>
            <Input
              id="ap-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Re-verify high-risk sellers"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-secondary-text" htmlFor="ap-desc">
              Description
            </label>
            <Textarea
              id="ap-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will be executed and why."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-secondary-text">Priority</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
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
          <div>
            <label className="text-xs font-medium text-secondary-text">Initiative</label>
            <Select value={initiativeId} onValueChange={setInitiativeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No initiative</SelectItem>
                {data.initiatives.map((initiative) => (
                  <SelectItem key={initiative.id} value={initiative.id}>
                    {initiative.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-secondary-text" htmlFor="ap-deadline">
              Deadline
            </label>
            <Input id="ap-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={submit} disabled={!title.trim()}>
            <Plus className="size-4" /> Create action plan
          </Button>
          <FormError message={lastError} />
        </div>
      </GovernanceCard>

      <GovernanceCard
        title={`Action plans (${data.actionPlans.length})`}
        description="Assign owners, advance the workflow, and track progress to completion."
      >
        <div className="space-y-3">
          {data.actionPlans.map((plan) => (
            <div key={plan.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-primary-text">{plan.title}</p>
                    <Badge variant={priorityTone(plan.priority)}>{plan.priority}</Badge>
                    <StatusBadge status={plan.status} />
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">
                    {plan.code} · Initiative: {initiativeName(data, plan.initiativeId)} · Due{" "}
                    {new Date(plan.deadline).toLocaleDateString()}
                  </p>
                  {plan.description ? (
                    <p className="mt-1 text-sm text-secondary-text">{plan.description}</p>
                  ) : null}
                </div>
                <div className="w-44">
                  <label className="text-xs font-medium text-secondary-text">Owner</label>
                  <Select
                    value={plan.ownerId ?? "unassigned"}
                    onValueChange={(v) => assignOwner("actionPlan", plan.id, v === "unassigned" ? "" : v)}
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

              {plan.links.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link2 className="size-3 text-secondary-text" />
                  {plan.links.map((link) => (
                    <Badge key={`${link.source}-${link.refId}`} variant="ai">
                      {link.source}: {link.label}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-2">
                <ProgressBar value={plan.progress} />
                <span className="text-xs tabular-nums text-secondary-text">{plan.progress}%</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-secondary-text">Owner: {ownerName(data, plan.ownerId)}</span>
                <WorkflowControls
                  entityType="actionPlan"
                  entityId={plan.id}
                  status={plan.status}
                  onTransition={transitionEntity}
                />
              </div>
            </div>
          ))}
        </div>
      </GovernanceCard>
    </div>
  );
}
