import { PageContainer } from "@/components/layout/page-container";
import { SettingsScreen } from "@/features/secis/components/settings-screen";

export const metadata = { title: "SECIS Settings" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <SettingsScreen />
    </PageContainer>
  );
}
