import { PageContainer } from "@/components/layout/page-container";
import { ScenariosScreen } from "@/features/secis/components/scenarios-screen";

export const metadata = { title: "Scenarios" };

export default function ScenariosPage() {
  return (
    <PageContainer>
      <ScenariosScreen />
    </PageContainer>
  );
}
