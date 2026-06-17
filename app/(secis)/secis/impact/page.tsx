import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ImpactStudio } from "@/features/secis/components/impact-studio";
import { DetailSkeleton } from "@/features/secis/components/skeletons";

export const metadata = { title: "Impact Analysis Studio" };

export default function ImpactPage() {
  return (
    <PageContainer>
      <Suspense fallback={<DetailSkeleton />}>
        <ImpactStudio />
      </Suspense>
    </PageContainer>
  );
}
