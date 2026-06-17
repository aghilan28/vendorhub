import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ResultsScreen } from "@/features/simulation/components/analysis-studio";
import { DetailSkeleton } from "@/features/simulation/components/skeletons";

export const metadata = { title: "Analysis Studio" };

export default function ResultsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<DetailSkeleton />}>
        <ResultsScreen />
      </Suspense>
    </PageContainer>
  );
}
