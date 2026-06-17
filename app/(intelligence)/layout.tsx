import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { intelligenceNavigation } from "@/lib/constants/navigation";
import { IntelligenceHeader } from "@/features/intelligence-platform/components/workspace-chrome";

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={intelligenceNavigation} title="Intelligence" />
      <div className="min-w-0 flex-1">
        <IntelligenceHeader />
        {children}
      </div>
    </div>
  );
}
