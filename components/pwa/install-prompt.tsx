"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerInstallPrompt } from "@/lib/pwa/runtime";
import { useMobileStore } from "@/store/mobile-store";

export function InstallPrompt() {
  const ready = useMobileStore((state) => state.installPromptReady);
  const isStandalone = useMobileStore((state) => state.isStandalone);
  const dismissedAt = useMobileStore((state) => state.installDismissedAt);
  const dismiss = useMobileStore((state) => state.dismissInstallPrompt);

  if (!ready || isStandalone || recentlyDismissed(dismissedAt)) return null;

  return (
    <section className="fixed inset-x-3 bottom-20 z-40 rounded-lg border border-emerald-200 bg-surface p-3 shadow-lg md:hidden">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-brand">
          <Download className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-primary-text">Install VendorHub</p>
          <p className="mt-1 text-xs leading-5 text-secondary-text">Faster launch, cached shopping, delivery alerts, and seller actions from your home screen.</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void triggerInstallPrompt()}>
              <Download /> Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Dismiss install prompt">
              <X />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function recentlyDismissed(value?: string) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 1000 * 60 * 60 * 24 * 7;
}
