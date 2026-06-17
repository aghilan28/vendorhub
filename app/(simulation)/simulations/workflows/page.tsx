import { PageContainer } from "@/components/layout/page-container";
import { WorkflowEngine } from "@/features/simulation/components/workflow-engine";

export const metadata = { title: "Workflow Engine" };

export default function WorkflowsPage() {
  return (
    <PageContainer>
      <WorkflowEngine />
    </PageContainer>
  );
}
