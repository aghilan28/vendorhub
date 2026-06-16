import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { LineageCenter } from "@/features/intelligence-platform/components/lineage-center";
import { ListSkeleton } from "@/features/intelligence-platform/components/skeletons";

export const metadata = { title: "Lineage Center" };

export default function LineagePage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <LineageCenter />
      </Suspense>
    </PageContainer>
  );
}
