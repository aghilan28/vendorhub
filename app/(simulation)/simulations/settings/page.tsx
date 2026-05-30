import { PageContainer } from "@/components/layout/page-container";
import { SettingsScreen } from "@/features/simulation/components/settings-screen";

export const metadata = { title: "Simulation Settings" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <SettingsScreen />
    </PageContainer>
  );
}
