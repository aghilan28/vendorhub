"use client";

import { ReactNode } from "react";
import { AccessibilityAnnouncer } from "@/components/experience/accessibility-announcer";
import { QueryProvider } from "./query-provider";
import { RealtimeProvider } from "./realtime-provider";
import { VendorHubI18nProvider } from "@/components/i18n/i18n-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { PwaRuntime } from "@/components/pwa/pwa-runtime";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <VendorHubI18nProvider>
      <QueryProvider>
        <TooltipProvider>
          <ToastProvider>
            <PwaRuntime />
            <OfflineBanner />
            <RealtimeProvider>
              <AccessibilityAnnouncer />
              {children}
            </RealtimeProvider>
            <InstallPrompt />
            <ToastViewport />
          </ToastProvider>
        </TooltipProvider>
      </QueryProvider>
    </VendorHubI18nProvider>
  );
}
