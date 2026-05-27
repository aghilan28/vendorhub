import { PageContainer } from "@/components/layout/page-container";
import { AdminFinanceOversight } from "@/features/commerce-finance/components/admin-finance-oversight";
import { ModerationActionPanel } from "@/features/admin/components/detail-screens";
import { RefundsScreen } from "@/features/admin/components/table-screens";

export default function AdminRefundsPage() {
  return (
    <PageContainer className="space-y-6">
      <AdminFinanceOversight />
      <RefundsScreen />
      <ModerationActionPanel />
    </PageContainer>
  );
}
