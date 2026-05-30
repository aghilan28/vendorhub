import { PageContainer } from "@/components/layout/page-container";
import { SettingsScreen } from "@/features/governance-os/components/settings-screen";

export const metadata = { title: "Governance Settings" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <SettingsScreen />
    </PageContainer>
  );
}
