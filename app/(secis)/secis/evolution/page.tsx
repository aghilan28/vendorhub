import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { EvolutionStudio } from "@/features/secis/components/evolution-studio";
import { DetailSkeleton } from "@/features/secis/components/skeletons";

export const metadata = { title: "Evolution Studio" };

export default function EvolutionPage() {
  return (
    <PageContainer>
      <Suspense fallback={<DetailSkeleton />}>
        <EvolutionStudio />
      </Suspense>
    </PageContainer>
  );
}
