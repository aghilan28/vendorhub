import { PageContainer } from "@/components/layout/page-container";
import { AdminVerificationDashboard } from "@/features/trust/components/admin-verification-dashboard";
import { VendorsScreen } from "@/features/admin/components/table-screens";

export default function AdminVendorsPage() {
  return (
    <PageContainer className="space-y-6">
      <AdminVerificationDashboard />
      <VendorsScreen />
    </PageContainer>
  );
}
