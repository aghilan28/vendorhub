import { PageLoader } from "@/components/feedback/page-loader";
import { PageContainer } from "@/components/layout/page-container";

export default function Loading() {
  return (
    <PageContainer>
      <PageLoader />
    </PageContainer>
  );
}
