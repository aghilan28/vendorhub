import { Boxes } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";

export function ShellPage({ title, description }: { title: string; description: string }) {
  return (
    <PageContainer>
      <SectionWrapper title={title} description={description}>
        <EmptyState
          icon={Boxes}
          title="Foundation shell ready"
          description="This route is intentionally prepared without business logic, backend data, payments, realtime, or AI behavior."
          actionLabel="View structure"
        />
      </SectionWrapper>
    </PageContainer>
  );
}
