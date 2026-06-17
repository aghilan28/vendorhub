import { PageContainer } from "@/components/layout/page-container";
import { SearchCenter } from "@/features/intelligence-platform/components/search-center";

export const metadata = { title: "Cross-System Search" };

export default function SearchPage() {
  return (
    <PageContainer>
      <SearchCenter />
    </PageContainer>
  );
}
