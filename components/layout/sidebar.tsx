import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export function Sidebar({ items, title, className }: { items: readonly SidebarItem[]; title: string; className?: string }) {
  return (
    <aside className={cn("hidden min-h-screen w-64 shrink-0 border-r border-border bg-surface lg:block", className)}>
      <div className="flex h-16 items-center border-b border-border px-5">
        <span className="font-semibold text-primary-text">{title}</span>
      </div>
      <nav className="space-y-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href as Route} className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-secondary-text focus-ring hover:bg-slate-100 hover:text-primary-text">
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
