import Link from "next/link";
import type { Route } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export function Pagination({ previousHref, nextHref }: { previousHref?: string; nextHref?: string }) {
  return (
    <nav className="flex items-center justify-end gap-2" aria-label="Pagination">
      <Button variant="secondary" size="sm" asChild disabled={!previousHref}>
        <Link href={(previousHref ?? "#") as Route} aria-disabled={!previousHref}>
          <ChevronLeft /> Previous
        </Link>
      </Button>
      <Button variant="secondary" size="sm" asChild disabled={!nextHref}>
        <Link href={(nextHref ?? "#") as Route} aria-disabled={!nextHref}>
          Next <ChevronRight />
        </Link>
      </Button>
    </nav>
  );
}
