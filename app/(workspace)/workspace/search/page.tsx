import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { WorkspaceSearch } from "@/features/workspace/components/search-center";
import { ListSkeleton } from "@/features/workspace/components/skeletons";

export const metadata = { title: "Unified Search" };

export default function SearchPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <WorkspaceSearch />
      </Suspense>
    </PageContainer>
  );
}
