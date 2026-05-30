import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { intelligenceNavigation } from "@/lib/constants/navigation";

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={intelligenceNavigation} title="Commerce Intelligence" />
      <div className="min-w-0 flex-1">
        <DashboardHeader title="Commerce Intelligence" context="Tier 4–9 intelligence workspace" mobileKind="seller" mobileTitle="Commerce Intelligence" />
        {children}
      </div>
    </div>
  );
}
