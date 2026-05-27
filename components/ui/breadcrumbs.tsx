import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-secondary-text">
      {items.map((item, index) => (
        <span className="flex items-center gap-1" key={item.label}>
          {item.href ? (
            <Link className="hover:text-brand" href={item.href as Route}>
              {item.label}
            </Link>
          ) : (
            <span className="text-primary-text">{item.label}</span>
          )}
          {index < items.length - 1 ? <ChevronRight className="size-4" aria-hidden /> : null}
        </span>
      ))}
    </nav>
  );
}
