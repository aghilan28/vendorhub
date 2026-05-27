import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NetworkStatusPill } from "@/components/pwa/network-status-pill";
import { MobileWorkspaceNav } from "./mobile-workspace-nav";

export function DashboardHeader({
  title,
  context,
  mobileKind,
  mobileTitle = "VendorHub",
}: {
  title: string;
  context: string;
  mobileKind?: "admin" | "seller";
  mobileTitle?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {mobileKind ? <MobileWorkspaceNav kind={mobileKind} title={mobileTitle} /> : null}
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-secondary-text">{context}</p>
          <h1 className="truncate text-lg font-semibold text-primary-text">{title}</h1>
        </div>
        <div className="ml-auto hidden w-80 items-center md:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
            <Input className="pl-9" placeholder="Search operations" />
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <NetworkStatusPill />
          <Button asChild variant="secondary" size="icon" aria-label="Notifications">
            <Link href="/seller/notifications"><Bell /></Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
