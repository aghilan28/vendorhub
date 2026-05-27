import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { sellerNavigation } from "@/lib/constants/navigation";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <DashboardSidebar items={sellerNavigation} title="VendorHub Seller" />
      <div className="min-w-0 flex-1">
        <DashboardHeader title="Seller operations" context="Vendor control plane" mobileKind="seller" mobileTitle="VendorHub Seller" />
        {children}
      </div>
    </div>
  );
}
