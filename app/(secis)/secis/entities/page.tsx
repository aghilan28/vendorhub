import { PageContainer } from "@/components/layout/page-container";
import { EntityExplorer } from "@/features/secis/components/entity-explorer";

export const metadata = { title: "Entity Explorer" };

export default function EntitiesPage() {
  return (
    <PageContainer>
      <EntityExplorer />
    </PageContainer>
  );
}
