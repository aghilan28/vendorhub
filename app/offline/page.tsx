import { CloudOff, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <PageContainer className="py-10">
      <EmptyState
        icon={CloudOff}
        title="Cached commerce mode"
        description="VendorHub is offline right now. Cached home, product, order, tracking, seller, and admin views can still open when available."
        action={
          <Button asChild variant="secondary">
            <Link href="/">
              <ShoppingBag /> Open cached home
            </Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
