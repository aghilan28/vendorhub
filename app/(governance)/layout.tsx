import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { governanceNavigation } from "@/lib/constants/navigation";
import { GovernanceHeader } from "@/features/governance-os/components/workspace-chrome";

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={governanceNavigation} title="Governance OS" />
      <div className="min-w-0 flex-1">
        <GovernanceHeader />
        {children}
      </div>
    </div>
  );
}
