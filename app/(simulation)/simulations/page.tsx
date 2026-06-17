import { PageContainer } from "@/components/layout/page-container";
import { CommandCenter } from "@/features/simulation/components/command-center";

export const metadata = { title: "Simulation Command Center" };

export default function SimulationsPage() {
  return (
    <PageContainer>
      <CommandCenter />
    </PageContainer>
  );
}
