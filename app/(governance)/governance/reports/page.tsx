import { PageContainer } from "@/components/layout/page-container";
import { Reporting } from "@/features/governance-os/components/reporting";

export const metadata = { title: "Governance Reporting" };

export default function ReportsPage() {
  return (
    <PageContainer>
      <Reporting />
    </PageContainer>
  );
}
