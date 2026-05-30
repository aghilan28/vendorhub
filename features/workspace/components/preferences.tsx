"use client";

import Link from "next/link";
import type { Route } from "next";
import { Settings2, Star, Bookmark, Search, RefreshCw, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REF_SYSTEMS, SYSTEM_META, roleLabel, type RefSystem } from "@/lib/workspace";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useCurrentUser, useHydrated } from "../hooks";
import { WorkspaceShell, WSCard } from "./primitives";
import { HomeSkeleton } from "./skeletons";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className={`inline-flex h-6 w-11 items-center rounded-full transition focus-ring ${on ? "bg-brand" : "bg-slate-300"}`}>
      <span className={`inline-block size-5 transform rounded-full bg-white transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function WorkspacePreferences() {
  const hydrated = useHydrated();
  const prefs = useWorkspaceStore((s) => s.preferences);
  const updatePreferences = useWorkspaceStore((s) => s.updatePreferences);
  const bookmarks = useWorkspaceStore((s) => s.bookmarks);
  const favorites = useWorkspaceStore((s) => s.favorites);
  const savedSearches = useWorkspaceStore((s) => s.savedSearches);
  const removeBookmark = useWorkspaceStore((s) => s.removeBookmark);
  const removeFavorite = useWorkspaceStore((s) => s.removeFavorite);
  const deleteSearch = useWorkspaceStore((s) => s.deleteSearch);
  const resetToSeed = useWorkspaceStore((s) => s.resetToSeed);
  const user = useCurrentUser();

  if (!hydrated) return <HomeSkeleton />;

  function togglePinned(sys: RefSystem) {
    const has = prefs.pinnedSystems.includes(sys);
    updatePreferences({ pinnedSystems: has ? prefs.pinnedSystems.filter((s) => s !== sys) : [...prefs.pinnedSystems, sys] });
  }

  return (
    <WorkspaceShell title="Personalization" description="Tune your workspace: default landing, density, pinned systems, favorites, bookmarks, and saved searches.">
      <WSCard title="Preferences" action={<Settings2 className="size-4 text-secondary-text" />}>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-primary-text">Default landing</label>
            <Select value={prefs.defaultLanding} onValueChange={(v) => updatePreferences({ defaultLanding: v as "workspace" | "intelligence" })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="workspace">My Workspace</SelectItem><SelectItem value="intelligence">Intelligence Dashboard</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-text">Density</label>
            <Select value={prefs.density} onValueChange={(v) => updatePreferences({ density: v as "comfortable" | "compact" })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="comfortable">Comfortable</SelectItem><SelectItem value="compact">Compact</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 md:col-span-2">
            <span className="text-sm text-primary-text">Show system health on home</span>
            <Toggle on={prefs.showSystemHealth} onChange={(v) => updatePreferences({ showSystemHealth: v })} />
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-primary-text">Pinned systems</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {REF_SYSTEMS.map((sys) => <button key={sys} type="button" onClick={() => togglePinned(sys)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${prefs.pinnedSystems.includes(sys) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{SYSTEM_META[sys].label}</button>)}
            </div>
          </div>
        </div>
      </WSCard>

      <WSCard title="Your access">
        <div className="flex items-center gap-3 rounded-md border border-border p-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-brand"><ShieldCheck className="size-5" /></span>
          <div><p className="text-sm font-medium text-primary-text">{user.name}</p><p className="text-xs text-secondary-text">{roleLabel(user.role)}</p></div>
        </div>
      </WSCard>

      <div className="grid gap-6 xl:grid-cols-3">
        <WSCard title="Favorites" description="Quick-access links." action={<Star className="size-4 text-secondary-text" />}>
          {favorites.length === 0 ? <p className="text-sm text-secondary-text">No favorites.</p> : (
            <div className="space-y-1.5">{favorites.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"><Link href={f.route as Route} className="truncate text-sm text-primary-text hover:underline">{f.label}</Link><Button size="icon" variant="ghost" className="size-7" onClick={() => removeFavorite(f.id)} aria-label="Remove favorite"><Trash2 className="size-3.5" /></Button></div>
            ))}</div>
          )}
        </WSCard>
        <WSCard title="Bookmarks" description="Saved items." action={<Bookmark className="size-4 text-secondary-text" />}>
          {bookmarks.length === 0 ? <p className="text-sm text-secondary-text">No bookmarks.</p> : (
            <div className="space-y-1.5">{bookmarks.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"><Link href={b.route as Route} className="truncate text-sm text-primary-text hover:underline">{b.label}</Link><div className="flex items-center gap-1.5"><Badge variant="secondary">{b.system}</Badge><Button size="icon" variant="ghost" className="size-7" onClick={() => removeBookmark(b.id)} aria-label="Remove bookmark"><Trash2 className="size-3.5" /></Button></div></div>
            ))}</div>
          )}
        </WSCard>
        <WSCard title="Saved searches" action={<Search className="size-4 text-secondary-text" />}>
          {savedSearches.length === 0 ? <p className="text-sm text-secondary-text">No saved searches.</p> : (
            <div className="space-y-1.5">{savedSearches.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5"><Link href={`/workspace/search?q=${encodeURIComponent(s.query)}&system=${s.system}` as Route} className="truncate text-sm text-primary-text hover:underline">{s.label}</Link><Button size="icon" variant="ghost" className="size-7" onClick={() => deleteSearch(s.id)} aria-label="Delete saved search"><Trash2 className="size-3.5" /></Button></div>
            ))}</div>
          )}
        </WSCard>
      </div>

      <WSCard title="Maintenance" description="Reset the workspace to its seeded demo state.">
        <Button variant="destructive" onClick={resetToSeed}><RefreshCw className="size-4" /> Reset workspace data</Button>
      </WSCard>
    </WorkspaceShell>
  );
}
