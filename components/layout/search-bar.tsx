"use client";

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBar({ className, placeholder = "Search will activate after verified products are ingested" }: { className?: string; placeholder?: string }) {
  const { t } = useTranslation();

  return (
    <form action="/search" className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
      <Input name="q" aria-label={t("search.aria")} className="h-12 rounded-lg pl-11 text-base shadow-sm focus-visible:shadow-[0_0_0_3px_rgba(5,150,105,0.12)]" placeholder={placeholder} />
    </form>
  );
}
