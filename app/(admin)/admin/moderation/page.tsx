import { PageContainer } from "@/components/layout/page-container";
import { ModerationActionPanel } from "@/features/admin/components/detail-screens";
import { ModerationScreen } from "@/features/admin/components/table-screens";
import { AdminGovernanceDashboard } from "@/features/governance/components/admin-governance-dashboard";

export default function AdminModerationPage() {
  return (
    <PageContainer className="space-y-6">
      <AdminGovernanceDashboard />
      <ModerationScreen />
      <ModerationActionPanel />
    </PageContainer>
  );
}
