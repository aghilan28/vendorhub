import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { secisNavigation } from "@/lib/constants/navigation";
import { ExecutionRunner } from "@/features/secis/components/execution-runner";
import { SecisHeader } from "@/features/secis/components/workspace-chrome";

export default function SecisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={secisNavigation} title="SECIS" />
      <div className="min-w-0 flex-1">
        <SecisHeader />
        <ExecutionRunner />
        {children}
      </div>
    </div>
  );
}
