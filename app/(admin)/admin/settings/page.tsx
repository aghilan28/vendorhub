import { PageContainer } from "@/components/layout/page-container";
import { AdminSettingsScreen, SettingsTrustPanel } from "@/features/admin/components/detail-screens";

export default function AdminSettingsPage() {
  return (
    <PageContainer className="space-y-6">
      <AdminSettingsScreen />
      <SettingsTrustPanel />
    </PageContainer>
  );
}
