import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ProvenanceCenter } from "@/features/intelligence-platform/components/provenance-center";
import { ListSkeleton } from "@/features/intelligence-platform/components/skeletons";

export const metadata = { title: "Provenance System" };

export default function ProvenancePage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <ProvenanceCenter />
      </Suspense>
    </PageContainer>
  );
}
