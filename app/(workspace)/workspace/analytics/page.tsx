import { PageContainer } from "@/components/layout/page-container";
import { WorkspaceAnalytics } from "@/features/workspace/components/analytics";

export const metadata = { title: "Product Analytics" };

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <WorkspaceAnalytics />
    </PageContainer>
  );
}
