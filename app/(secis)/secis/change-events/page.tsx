import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { ChangeEventStudio } from "@/features/secis/components/change-event-studio";
import { ListSkeleton } from "@/features/secis/components/skeletons";

export const metadata = { title: "Change Event Studio" };

export default function ChangeEventsPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <ChangeEventStudio />
      </Suspense>
    </PageContainer>
  );
}
