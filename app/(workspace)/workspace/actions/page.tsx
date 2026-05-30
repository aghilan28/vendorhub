import { PageContainer } from "@/components/layout/page-container";
import { ActionCenter } from "@/features/workspace/components/action-center";

export const metadata = { title: "Action Center" };

export default function ActionsPage() {
  return (
    <PageContainer>
      <ActionCenter />
    </PageContainer>
  );
}
