import { PageContainer } from "@/components/layout/page-container";
import { DependenciesScreen } from "@/features/secis/components/dependencies-screen";

export const metadata = { title: "Dependencies" };

export default function DependenciesPage() {
  return (
    <PageContainer>
      <DependenciesScreen />
    </PageContainer>
  );
}
