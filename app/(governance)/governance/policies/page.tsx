import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PolicyManagement } from "@/features/governance-os/components/policy-management";
import { ListSkeleton } from "@/features/governance-os/components/skeletons";

export const metadata = { title: "Policy Management" };

export default function PoliciesPage() {
  return (
    <PageContainer>
      <Suspense fallback={<ListSkeleton />}>
        <PolicyManagement />
      </Suspense>
    </PageContainer>
  );
}
