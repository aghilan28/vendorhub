import { PageContainer } from "@/components/layout/page-container";
import { WorkspaceHome } from "@/features/workspace/components/home";

export const metadata = { title: "My Workspace" };

export default function WorkspacePage() {
  return (
    <PageContainer>
      <WorkspaceHome />
    </PageContainer>
  );
}
