import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ProjectCenter } from "@/features/workspace/components/project-center";
import { ListSkeleton } from "@/features/workspace/components/skeletons";

export const metadata = { title: "Project Center" };

export default function ProjectsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <ProjectCenter />
      </Suspense>
    </PageContainer>
  );
}
