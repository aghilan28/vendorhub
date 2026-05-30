"use client";

import { useState } from "react";
import { Settings2, ShieldCheck, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_PERMISSION_MATRIX, roleLabel, visibilityLabel, type PlatformRole, type Visibility } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useCurrentUser, useHydrated, usePermission } from "../hooks";
import { GovShell, GovCard } from "./primitives";
import { DetailSkeleton } from "./skeletons";

const PERMISSIONS = ["policy.manage", "policy.approve", "decision.create", "decision.review", "decision.approve", "risk.manage", "exception.request", "exception.approve", "report.generate", "settings.manage"] as const;
const ROLES: PlatformRole[] = ["governance_admin", "policy_owner", "reviewer", "approver", "auditor", "viewer"];

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className={`inline-flex h-6 w-11 items-center rounded-full transition focus-ring disabled:opacity-50 ${on ? "bg-brand" : "bg-slate-300"}`}>
      <span className={`inline-block size-5 transform rounded-full bg-white transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsScreen() {
  const hydrated = useHydrated();
  const settings = useGovernanceStore((s) => s.settings);
  const updateSettings = useGovernanceStore((s) => s.updateSettings);
  const resetToSeed = useGovernanceStore((s) => s.resetToSeed);
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
    <GovShell title="Settings & Security" description="Governance defaults, role-based access control, and workspace maintenance." actions={saved ? <Badge variant="default"><Check className="size-3" /> Saved</Badge> : undefined}>
      <GovCard title="Governance defaults" action={<Settings2 className="size-4 text-secondary-text" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm text-primary-text">Require two approvals</span>
            <Toggle on={settings.requireTwoApprovals} onChange={(v) => touch({ requireTwoApprovals: v })} disabled={!canManage} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span className="text-sm text-primary-text">Auto-generate recommendations</span>
            <Toggle on={settings.autoGenerateRecommendations} onChange={(v) => touch({ autoGenerateRecommendations: v })} disabled={!canManage} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Default visibility</label>
            <Select value={settings.defaultVisibility} onValueChange={(v) => touch({ defaultVisibility: v as Visibility })} disabled={!canManage}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="private">{visibilityLabel("private")}</SelectItem><SelectItem value="team">{visibilityLabel("team")}</SelectItem><SelectItem value="organization">{visibilityLabel("organization")}</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Compliance target (%)</label>
            <Input className="mt-1.5" type="number" value={settings.complianceTargetPct} onChange={(e) => touch({ complianceTargetPct: Math.max(0, Math.min(100, Number(e.target.value))) })} disabled={!canManage} />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Default exception duration (days)</label>
            <Input className="mt-1.5" type="number" value={settings.exceptionDefaultDays} onChange={(e) => touch({ exceptionDefaultDays: Math.max(1, Number(e.target.value)) })} disabled={!canManage} />
          </div>
        </div>
        {!canManage ? <p className="mt-3 text-xs text-danger">Only a Governance Admin can change settings. Switch to Anita Desai in the header.</p> : null}
      </GovCard>

      <GovCard title="Your access">
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-brand"><ShieldCheck className="size-5" /></span>
          <div><p className="text-sm font-medium text-primary-text">{user.name}</p><p className="text-xs text-secondary-text">{roleLabel(user.role)}</p></div>
        </div>
      </GovCard>

      <GovCard title="Role-based access control" description="Permissions granted per role.">
        <div className="responsive-table-shell">
          <Table>
            <TableHeader><TableRow><TableHead>Permission</TableHead>{ROLES.map((r) => <TableHead key={r}>{roleLabel(r)}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {PERMISSIONS.map((perm) => (
                <TableRow key={perm}>
                  <TableCell className="font-medium text-primary-text">{perm}</TableCell>
                  {ROLES.map((r) => <TableCell key={r}>{ROLE_PERMISSION_MATRIX[r].includes(perm) ? <Check className="size-4 text-success" /> : <span className="text-secondary-text">—</span>}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GovCard>

      <GovCard title="Maintenance" description="Reset the workspace to its seeded demo state.">
        <Button variant="destructive" disabled={!canManage} onClick={() => setResetOpen(true)}><RefreshCw className="size-4" /> Reset to seed data</Button>
      </GovCard>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset workspace</DialogTitle><DialogDescription>This replaces all policies, decisions, risks, exceptions, and audit history with the original seed data.</DialogDescription></DialogHeader>
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setResetOpen(false)}>Cancel</Button><Button variant="destructive" onClick={() => { resetToSeed(); setResetOpen(false); }}>Reset everything</Button></div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
