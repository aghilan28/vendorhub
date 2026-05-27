import Link from "next/link";
import { Menu, ShoppingCart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Button className="md:hidden" variant="ghost" size="icon" aria-label="Open navigation">
          <Menu />
        </Button>
        <Link href="/" className="flex min-h-11 min-w-[8rem] shrink-0 items-center gap-2 rounded-md font-semibold text-primary-text focus-ring">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm text-white">K</span>
          <span className="whitespace-nowrap">VendorHub</span>
        </Link>
        <SearchBar className="hidden max-w-2xl flex-1 md:block" />
        <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Profile" asChild>
            <Link href="/profile">
              <User />
            </Link>
          </Button>
          <Button className="w-11 px-0 sm:w-auto sm:px-3" variant="secondary" size="sm" asChild>
            <Link href="/cart" aria-label="Cart">
              <ShoppingCart /> <span className="hidden xs:inline sm:inline">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
      <div className="space-y-3 border-t border-border px-4 py-3 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
