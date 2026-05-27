import { Label } from "@radix-ui/react-label";
import type { ReactNode } from "react";

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase text-secondary-text">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-secondary-text">{hint}</p> : null}
    </div>
  );
}
