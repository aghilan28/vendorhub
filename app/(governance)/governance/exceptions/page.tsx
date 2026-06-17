import { PageContainer } from "@/components/layout/page-container";
import { ExceptionManagement } from "@/features/governance-os/components/exception-management";

export const metadata = { title: "Exception Management" };

export default function ExceptionsPage() {
  return (
    <PageContainer>
      <ExceptionManagement />
    </PageContainer>
  );
}
