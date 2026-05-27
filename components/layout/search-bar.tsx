"use client";

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBar({ className, placeholder = "Search products, vendors, categories" }: { className?: string; placeholder?: string }) {
  const { t } = useTranslation();

  return (
    <form action="/search" className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-secondary-text" />
      <Input name="q" aria-label={t("search.aria")} className="h-10 pl-9" placeholder={placeholder === "Search products, vendors, categories" ? t("search.placeholder") : placeholder} />
    </form>
  );
}
