import { PageContainer } from "@/components/layout/page-container";
import { ExecutionCenter } from "@/features/simulation/components/execution-center";

export const metadata = { title: "Execution Center" };

export default function RunsPage() {
  return (
    <PageContainer>
      <ExecutionCenter />
    </PageContainer>
  );
}
