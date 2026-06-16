import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ComparisonEngine } from "@/features/simulation/components/comparison-engine";
import { ListSkeleton } from "@/features/simulation/components/skeletons";

export const metadata = { title: "Comparison Engine" };

export default function ComparePage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <ComparisonEngine />
      </Suspense>
    </PageContainer>
  );
}
