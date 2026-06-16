import { PageContainer } from "@/components/layout/page-container";
import { IntelligenceInbox } from "@/features/workspace/components/inbox";

export const metadata = { title: "Intelligence Inbox" };

export default function InboxPage() {
  return (
    <PageContainer>
      <IntelligenceInbox />
    </PageContainer>
  );
}
