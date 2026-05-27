import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { adminNavigation } from "@/lib/constants/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={adminNavigation} title="VendorHub Admin" />
      <div className="min-w-0 flex-1">
        <DashboardHeader title="Marketplace command center" context="Governance and operations" mobileKind="admin" mobileTitle="VendorHub Admin" />
        {children}
      </div>
    </div>
  );
}
