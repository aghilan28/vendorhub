import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ScenarioBuilder } from "@/features/simulation/components/scenario-builder";
import { ListSkeleton } from "@/features/simulation/components/skeletons";

export const metadata = { title: "Scenario Builder" };

export default function ScenariosPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <ScenarioBuilder />
      </Suspense>
    </PageContainer>
  );
}
