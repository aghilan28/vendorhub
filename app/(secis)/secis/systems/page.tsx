import { PageContainer } from "@/components/layout/page-container";
import { SystemExplorer } from "@/features/secis/components/system-explorer";

export const metadata = { title: "System Explorer" };

export default function SystemsPage() {
  return (
    <PageContainer>
      <SystemExplorer />
    </PageContainer>
  );
}
