"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { buyerNavigation } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

const navKeys = ["home", "search", "categories", "orders", "wishlist"] as const;

export function MobileNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_8px_rgba(15,23,42,0.06)] backdrop-blur md:hidden" aria-label="Primary mobile navigation">
      {buyerNavigation.slice(0, 5).map((item, index) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-secondary-text transition focus-ring active:bg-emerald-50",
              active && "text-brand",
            )}
          >
            <span className={cn("flex size-8 items-center justify-center rounded-md", active && "bg-emerald-50")}>
              <Icon className="size-4" />
            </span>
            <span className="max-w-full truncate px-1">{t(`nav.${navKeys[index]}`)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
