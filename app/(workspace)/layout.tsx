import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { workspaceNavigation } from "@/lib/constants/navigation";
import { WorkspaceHeader } from "@/features/workspace/components/workspace-chrome";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={workspaceNavigation} title="Workspace" />
      <div className="min-w-0 flex-1">
        <WorkspaceHeader />
        {children}
      </div>
    </div>
  );
}
