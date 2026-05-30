import { PageContainer } from "@/components/layout/page-container";
import { CommandCenter } from "@/features/secis/components/command-center";

export const metadata = { title: "SECIS Command Center" };

export default function SecisPage() {
  return (
    <PageContainer>
      <CommandCenter />
    </PageContainer>
  );
}
