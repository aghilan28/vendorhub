import { PageContainer } from "@/components/layout/page-container";
import { CompareScreen } from "@/features/secis/components/compare-screen";

export const metadata = { title: "Comparison Engine" };

export default function ComparePage() {
  return (
    <PageContainer>
      <CompareScreen />
    </PageContainer>
  );
}
