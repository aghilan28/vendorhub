import { PageContainer } from "@/components/layout/page-container";
import { WorkspacePreferences } from "@/features/workspace/components/preferences";

export const metadata = { title: "Personalization" };

export default function SettingsPage() {
  return (
    <PageContainer>
      <WorkspacePreferences />
    </PageContainer>
  );
}
