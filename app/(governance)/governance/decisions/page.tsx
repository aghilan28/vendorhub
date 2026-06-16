import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { DecisionCenter } from "@/features/governance-os/components/decision-center";
import { ListSkeleton } from "@/features/governance-os/components/skeletons";

export const metadata = { title: "Decision Center" };

export default function DecisionsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <DecisionCenter />
      </Suspense>
    </PageContainer>
  );
}
