import { PageContainer } from "@/components/layout/page-container";
import { WorkflowCenter } from "@/features/intelligence-platform/components/workflow-center";

export const metadata = { title: "Intelligence Workflows" };

export default function WorkflowsPage() {
  return (
    <PageContainer>
      <WorkflowCenter />
    </PageContainer>
  );
}
