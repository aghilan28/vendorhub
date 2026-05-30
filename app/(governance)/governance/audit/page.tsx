import { PageContainer } from "@/components/layout/page-container";
import { AuditCenter } from "@/features/governance-os/components/audit-center";

export const metadata = { title: "Audit Center" };

export default function AuditPage() {
  return (
    <PageContainer>
      <AuditCenter />
    </PageContainer>
  );
}
