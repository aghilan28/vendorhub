import { PageContainer } from "@/components/layout/page-container";
import { CommandCenter } from "@/features/governance-os/components/command-center";

export const metadata = { title: "Governance Command Center" };

export default function GovernancePage() {
  return (
    <PageContainer>
      <CommandCenter />
    </PageContainer>
  );
}
