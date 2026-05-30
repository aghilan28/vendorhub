"use client";

import Link from "next/link";
import { Menu, Plus, Network } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { secisNavigation } from "@/lib/constants/navigation";
import { roleLabel } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated } from "../hooks";

function SecisMobileNav() {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open SECIS navigation" disabled>
        <Menu />
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open SECIS navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="left-0 right-auto w-72 border-l-0 border-r p-0">
        <Sidebar items={secisNavigation} title="SECIS" className="block min-h-full border-r-0" />
      </SheetContent>
    </Sheet>
  );
}

function UserSwitcher() {
  const hydrated = useHydrated();
  const users = useSecisStore((s) => s.users);
  const currentUserId = useSecisStore((s) => s.currentUserId);
  const setCurrentUser = useSecisStore((s) => s.setCurrentUser);
  const current = users.find((u) => u.id === currentUserId) ?? users[0];

  if (!hydrated) return <span className="hidden h-9 w-40 animate-pulse rounded-md bg-slate-100 sm:block" />;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="ai" className="hidden sm:inline-flex">{roleLabel(current.role)}</Badge>
      <Select value={currentUserId} onValueChange={setCurrentUser}>
        <SelectTrigger className="h-9 min-h-9 w-40" aria-label="Switch acting user">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} · {roleLabel(u.role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SecisHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <SecisMobileNav />
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden size-9 items-center justify-center rounded-md bg-emerald-50 text-brand sm:flex">
            <Network className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-secondary-text">KARTEX SECIS</p>
            <h1 className="truncate text-lg font-semibold text-primary-text">Change impact workspace</h1>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <UserSwitcher />
          <Button asChild size="sm">
            <Link href="/secis/change-events">
              <Plus className="size-4" /> <span className="hidden sm:inline">New event</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
