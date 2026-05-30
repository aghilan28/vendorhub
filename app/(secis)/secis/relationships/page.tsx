import { PageContainer } from "@/components/layout/page-container";
import { RelationshipsScreen } from "@/features/secis/components/relationships-screen";

export const metadata = { title: "Relationships" };

export default function RelationshipsPage() {
  return (
    <PageContainer>
      <RelationshipsScreen />
    </PageContainer>
  );
}
