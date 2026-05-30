import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { simulationNavigation } from "@/lib/constants/navigation";
import { ExecutionRunner } from "@/features/simulation/components/execution-runner";
import { SimulationHeader } from "@/features/simulation/components/workspace-chrome";

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={simulationNavigation} title="Simulation OS" />
      <div className="min-w-0 flex-1">
        <SimulationHeader />
        <ExecutionRunner />
        {children}
      </div>
    </div>
  );
}
