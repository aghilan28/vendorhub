import { PageContainer } from "@/components/layout/page-container";
import { WorkflowEngine } from "@/features/governance-os/components/workflow-engine";

export const metadata = { title: "Approval Workflow Engine" };

export default function WorkflowsPage() {
  return (
    <PageContainer>
      <WorkflowEngine />
    </PageContainer>
  );
}
