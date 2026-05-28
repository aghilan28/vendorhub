import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={Compass}
        title="This route is not available"
        description="VendorHub kept the session intact. Return to marketplace discovery or continue through the available workspace."
        action={<Button asChild><Link href="/">Return to marketplace</Link></Button>}
      />
    </PageContainer>
  );
}
