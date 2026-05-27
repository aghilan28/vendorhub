"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuantitySelector({ value = 1 }: { value?: number }) {
  return (
    <div className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface">
      <Button variant="ghost" size="icon" aria-label="Decrease quantity">
        <Minus />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{value}</span>
      <Button variant="ghost" size="icon" aria-label="Increase quantity">
        <Plus />
      </Button>
    </div>
  );
}
