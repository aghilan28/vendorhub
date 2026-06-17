import { PageContainer } from "@/components/layout/page-container";
import { RiskCenter } from "@/features/secis/components/risk-center";

export const metadata = { title: "Risk Center" };

export default function RiskPage() {
  return (
    <PageContainer>
      <RiskCenter />
    </PageContainer>
  );
}
