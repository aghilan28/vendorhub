import { PageContainer } from "@/components/layout/page-container";
import { RiskCenter } from "@/features/governance-os/components/risk-center";

export const metadata = { title: "Risk Governance" };

export default function RisksPage() {
  return (
    <PageContainer>
      <RiskCenter />
    </PageContainer>
  );
}
