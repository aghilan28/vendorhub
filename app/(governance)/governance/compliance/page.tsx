import { PageContainer } from "@/components/layout/page-container";
import { ComplianceCenter } from "@/features/governance-os/components/compliance-center";

export const metadata = { title: "Compliance Center" };

export default function CompliancePage() {
  return (
    <PageContainer>
      <ComplianceCenter />
    </PageContainer>
  );
}
