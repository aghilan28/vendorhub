"use client";

// KARTEX M8 — Execution Workspace
// Tabbed shell composing every execution center into one operator surface.

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExecutionStore } from "../store";
import { ExecutionCommandCenter } from "./execution-command-center";
import { ActionPlanCenter } from "./action-plan-center";
import { InitiativeManagement } from "./initiative-management";
import { ProgramManagement } from "./program-management";
import { KpiCenter } from "./kpi-center";
import { EscalationCenter } from "./escalation-center";
import { DecisionActivation } from "./decision-activation";
import { ExecutionAnalytics } from "./execution-analytics";

const TABS = [
  { value: "command", label: "Command Center" },
  { value: "actions", label: "Action Plans" },
  { value: "initiatives", label: "Initiatives" },
  { value: "programs", label: "Programs" },
  { value: "kpis", label: "KPIs" },
  { value: "escalations", label: "Escalations" },
  { value: "decisions", label: "Decision Activation" },
  { value: "analytics", label: "Analytics & Outcomes" },
] as const;

export function ExecutionWorkspace() {
  const [tab, setTab] = useState<string>("command");
  const actor = useExecutionStore((s) => s.actor);
  const setActor = useExecutionStore((s) => s.setActor);
  const owners = useExecutionStore((s) => s.data.owners);
  const reset = useExecutionStore((s) => s.reset);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-primary-text">Execution & Decision Activation</h1>
          <p className="text-sm text-secondary-text">
            Convert research, knowledge, simulation, SECIS and governance into executable, measurable work.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-text">Acting as</span>
          <Select
            value={actor.id}
            onValueChange={(id) => {
              const owner = owners.find((o) => o.id === id);
              if (owner) setActor({ id: owner.id, name: owner.name });
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset execution workspace">
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="command">
          <ExecutionCommandCenter />
        </TabsContent>
        <TabsContent value="actions">
          <ActionPlanCenter />
        </TabsContent>
        <TabsContent value="initiatives">
          <InitiativeManagement />
        </TabsContent>
        <TabsContent value="programs">
          <ProgramManagement />
        </TabsContent>
        <TabsContent value="kpis">
          <KpiCenter />
        </TabsContent>
        <TabsContent value="escalations">
          <EscalationCenter />
        </TabsContent>
        <TabsContent value="decisions">
          <DecisionActivation />
        </TabsContent>
        <TabsContent value="analytics">
          <ExecutionAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
