"use client";

import { useState } from "react";
import { Plus, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POLICY_CATEGORIES, SOURCE_SYSTEMS, SOURCE_SYSTEM_META, type PolicyRule, type Severity, type SourceSystem } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { usePermission } from "../hooks";

interface FormRule {
  id: string;
  statement: string;
  type: PolicyRule["type"];
  severityIfViolated: Severity;
}
function localId() {
  return Math.random().toString(36).slice(2, 9);
}

export function PolicyForm({ policyId, onSaved, onCancel }: { policyId?: string; onSaved: (id: string) => void; onCancel: () => void }) {
  const existing = useGovernanceStore((s) => s.policies.find((p) => p.id === policyId));
  const users = useGovernanceStore((s) => s.users);
  const controls = useGovernanceStore((s) => s.controls);
  const createPolicy = useGovernanceStore((s) => s.createPolicy);
  const updatePolicy = useGovernanceStore((s) => s.updatePolicy);
  const canManage = usePermission("policy.manage");

  const [title, setTitle] = useState(existing?.title ?? "");
  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [category, setCategory] = useState(existing?.category ?? POLICY_CATEGORIES[0].id);
  const [systems, setSystems] = useState<SourceSystem[]>(existing?.appliesToSystems ?? ["internal"]);
  const [reviewerIds, setReviewerIds] = useState<string[]>(existing?.reviewerIds ?? []);
  const [approverIds, setApproverIds] = useState<string[]>(existing?.approverIds ?? []);
  const [controlIds, setControlIds] = useState<string[]>(existing?.controlIds ?? []);
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [rules, setRules] = useState<FormRule[]>(existing?.rules.map((r) => ({ id: r.id, statement: r.statement, type: r.type, severityIfViolated: r.severityIfViolated })) ?? []);
  const [newRule, setNewRule] = useState("");
  const [newRuleType, setNewRuleType] = useState<PolicyRule["type"]>("mandatory");
  const [newRuleSeverity, setNewRuleSeverity] = useState<Severity>("medium");

  function toggle<T>(list: T[], v: T, set: (l: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  function save() {
    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (existing) {
      updatePolicy(existing.id, { title, summary, category, appliesToSystems: systems, reviewerIds, approverIds, controlIds, tags: parsedTags, rules: rules.map((r) => ({ id: r.id, statement: r.statement, type: r.type, severityIfViolated: r.severityIfViolated })) });
      onSaved(existing.id);
    } else {
      const id = createPolicy({ title: title || "Untitled policy", summary, category, appliesToSystems: systems, rules: rules.map((r) => ({ statement: r.statement, type: r.type, severityIfViolated: r.severityIfViolated })), reviewerIds, approverIds, controlIds, tags: parsedTags });
      onSaved(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-primary-text">Title</label>
          <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Policy title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-text">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{POLICY_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-primary-text">Summary</label>
        <Textarea className="mt-1.5" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What does this policy govern?" />
      </div>

      <div>
        <p className="text-sm font-medium text-primary-text">Applies to systems</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SOURCE_SYSTEMS.map((sys) => (
            <button key={sys} type="button" onClick={() => toggle(systems, sys, setSystems)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${systems.includes(sys) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>
              {SOURCE_SYSTEM_META[sys].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="text-sm font-semibold text-primary-text">Rules</p>
        <div className="mt-2 space-y-1.5">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5">
              <span className="min-w-0 truncate text-sm text-primary-text">{r.statement}</span>
              <span className="flex shrink-0 items-center gap-1.5"><span className="text-[11px] text-secondary-text">{r.type} · {r.severityIfViolated}</span><Button size="icon" variant="ghost" className="size-7" onClick={() => setRules(rules.filter((x) => x.id !== r.id))} aria-label="Remove rule"><X className="size-3.5" /></Button></span>
            </div>
          ))}
          {rules.length === 0 ? <p className="text-xs text-secondary-text">No rules yet.</p> : null}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <Input value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="Rule statement" />
          <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as PolicyRule["type"])}>
            <SelectTrigger className="sm:w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="mandatory">Mandatory</SelectItem><SelectItem value="advisory">Advisory</SelectItem></SelectContent>
          </Select>
          <Select value={newRuleSeverity} onValueChange={(v) => setNewRuleSeverity(v as Severity)}>
            <SelectTrigger className="sm:w-28"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
          </Select>
          <Button variant="secondary" onClick={() => { if (newRule.trim()) { setRules([...rules, { id: localId(), statement: newRule.trim(), type: newRuleType, severityIfViolated: newRuleSeverity }]); setNewRule(""); } }}><Plus className="size-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-primary-text">Reviewers</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {users.map((u) => <button key={u.id} type="button" onClick={() => toggle(reviewerIds, u.id, setReviewerIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${reviewerIds.includes(u.id) ? "border-ai bg-blue-50 text-ai" : "border-border text-secondary-text hover:bg-slate-50"}`}>{u.name}</button>)}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-primary-text">Approvers</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {users.map((u) => <button key={u.id} type="button" onClick={() => toggle(approverIds, u.id, setApproverIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${approverIds.includes(u.id) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{u.name}</button>)}
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-primary-text">Linked controls</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {controls.map((c) => <button key={c.id} type="button" onClick={() => toggle(controlIds, c.id, setControlIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${controlIds.includes(c.id) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{c.name}</button>)}
        </div>
      </div>

      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save} disabled={!canManage}><Save className="size-4" /> {existing ? "Save changes" : "Create policy"}</Button>
      </div>
      {!canManage ? <p className="text-right text-xs text-danger">Your role cannot manage policies.</p> : null}
    </div>
  );
}
