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
        description="VendorHub kept the session intact. Continue with the demo path or return to marketplace discovery."
        action={<Button asChild><Link href="/demo">Open demo path</Link></Button>}
      />
    </PageContainer>
  );
}
