"use client";

import { useState } from "react";
import { Settings2, ShieldCheck, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_PERMISSION_MATRIX, roleLabel, visibilityLabel, type PlatformRole, type Visibility } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useCurrentUser, useHydrated, usePermission } from "../hooks";
import { SimShell, SimCard } from "./primitives";
import { DetailSkeleton } from "./skeletons";

const ALL_PERMISSIONS = [
  "simulation.create",
  "simulation.edit",
  "simulation.delete",
  "scenario.run",
  "review.submit",
  "approval.record",
  "decision.record",
  "settings.manage",
] as const;

const ROLES: PlatformRole[] = ["admin", "analyst", "reviewer", "viewer"];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`inline-flex h-6 w-11 items-center rounded-full transition focus-ring disabled:opacity-50 ${on ? "bg-brand" : "bg-slate-300"}`}
    >
      <span className={`inline-block size-5 transform rounded-full bg-white transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsScreen() {
  const hydrated = useHydrated();
  const settings = useSimulationStore((s) => s.settings);
  const updateSettings = useSimulationStore((s) => s.updateSettings);
  const resetToSeed = useSimulationStore((s) => s.resetToSeed);
  const user = useCurrentUser();
  const canManage = usePermission("settings.manage");
  const [resetOpen, setResetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!hydrated) return <DetailSkeleton />;

  function touch(patch: Parameters<typeof updateSettings>[0]) {
    updateSettings(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <SimShell
      title="Simulation Settings & Security"
      description="Governance defaults, role-based access control, and workspace maintenance for the Simulation Operating System."
      actions={saved ? <Badge variant="default"><Check className="size-3" /> Saved</Badge> : undefined}
    >
      <SimCard title="Workspace defaults" description="Applied to new simulations and runs." action={<Settings2 className="size-4 text-secondary-text" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-primary-text">Default visibility</label>
            <Select value={settings.defaultVisibility} onValueChange={(v) => touch({ defaultVisibility: v as Visibility })} disabled={!canManage}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">{visibilityLabel("private")}</SelectItem>
                <SelectItem value="team">{visibilityLabel("team")}</SelectItem>
                <SelectItem value="organization">{visibilityLabel("organization")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Default random seed</label>
            <Input className="mt-1.5" type="number" value={settings.defaultSeed} onChange={(e) => touch({ defaultSeed: Number(e.target.value) })} disabled={!canManage} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Runs retained</label>
            <Input className="mt-1.5" type="number" value={settings.retainRuns} onChange={(e) => touch({ retainRuns: Number(e.target.value) })} disabled={!canManage} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-primary-text">Require approval before run</span>
              <Toggle on={settings.requireApprovalBeforeRun} onChange={(v) => touch({ requireApprovalBeforeRun: v })} disabled={!canManage} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm text-primary-text">Auto-generate insights</span>
              <Toggle on={settings.autoGenerateInsights} onChange={(v) => touch({ autoGenerateInsights: v })} disabled={!canManage} />
            </div>
          </div>
        </div>
        {!canManage ? <p className="mt-3 text-xs text-danger">Only Admins can change workspace settings. Switch to Maya Rao (Admin) in the header.</p> : null}
      </SimCard>

      <SimCard title="Your access" description="The role you are currently acting as.">
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-brand"><ShieldCheck className="size-5" /></span>
          <div>
            <p className="text-sm font-medium text-primary-text">{user.name}</p>
            <p className="text-xs text-secondary-text">{roleLabel(user.role)}</p>
          </div>
        </div>
      </SimCard>

      <SimCard title="Role-based access control" description="Permissions granted per platform role.">
        <div className="responsive-table-shell">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                {ROLES.map((r) => (
                  <TableHead key={r}>{roleLabel(r)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ALL_PERMISSIONS.map((perm) => (
                <TableRow key={perm}>
                  <TableCell className="font-medium text-primary-text">{perm}</TableCell>
                  {ROLES.map((r) => (
                    <TableCell key={r}>
                      {ROLE_PERMISSION_MATRIX[r].includes(perm) ? <Check className="size-4 text-success" /> : <span className="text-secondary-text">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SimCard>

      <SimCard title="Maintenance" description="Reset the workspace to its seeded demo state.">
        <Button variant="destructive" disabled={!canManage} onClick={() => setResetOpen(true)}>
          <RefreshCw className="size-4" /> Reset to seed data
        </Button>
      </SimCard>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset workspace</DialogTitle>
            <DialogDescription>This replaces all simulations, scenarios, runs, and history with the original seed data. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { resetToSeed(); setResetOpen(false); }}>Reset everything</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SimShell>
  );
}
