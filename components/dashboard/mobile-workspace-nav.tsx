"use client";

import { Menu } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { adminNavigation, sellerNavigation } from "@/lib/constants/navigation";

export function MobileWorkspaceNav({ kind, title }: { kind: "admin" | "seller"; title: string }) {
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const items = kind === "admin" ? adminNavigation : sellerNavigation;

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open workspace navigation" disabled>
        <Menu />
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open workspace navigation">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent className="left-0 right-auto w-72 border-l-0 border-r p-0">
        <Sidebar items={items} title={title} className="block min-h-full border-r-0" />
      </SheetContent>
    </Sheet>
  );
}
