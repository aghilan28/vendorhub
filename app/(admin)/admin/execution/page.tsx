import { PageContainer } from "@/components/layout/page-container";
import { ExecutionWorkspace } from "@/features/execution/components/execution-workspace";

export const metadata = {
  title: "Execution & Decision Activation",
  description:
    "Operational execution platform: action plans, initiatives, programs, KPIs, escalations and decision activation.",
};

export default function AdminExecutionPage() {
  return (
    <PageContainer>
      <ExecutionWorkspace />
    </PageContainer>
  );
}
