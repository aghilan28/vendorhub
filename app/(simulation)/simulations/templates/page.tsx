import { PageContainer } from "@/components/layout/page-container";
import { TemplatesScreen } from "@/features/simulation/components/templates-screen";

export const metadata = { title: "Simulation Templates" };

export default function TemplatesPage() {
  return (
    <PageContainer>
      <TemplatesScreen />
    </PageContainer>
  );
}
