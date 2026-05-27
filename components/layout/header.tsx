"use client";

import { Heart, Menu, Package, Settings, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useCartStore } from "@/store/cart-store";
import { useLocationStore } from "@/store/location-store";
import { SearchBar } from "./search-bar";

export function Header() {
  const currentLocation = useLocationStore((state) => state.currentLocation);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:grid-cols-[auto_minmax(280px,1fr)_auto_auto_auto] lg:px-8">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 rounded-md font-semibold text-primary-text focus-ring" aria-label="VendorHub home">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-sm text-white">K</span>
          <span className="hidden whitespace-nowrap text-base sm:inline">VendorHub</span>
        </Link>

        <SearchBar className="min-w-0" />

        <Link href="/search" className="hidden min-h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-secondary-text transition hover:text-primary-text focus-ring md:flex" aria-label={`Delivery location ${currentLocation.locality}, ${currentLocation.city}`}>
          <span className="max-w-36 truncate">{currentLocation.locality}, {currentLocation.city}</span>
        </Link>

        <Button className="relative min-h-11 px-3" variant="secondary" size="sm" asChild>
          <Link href="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`}>
            <ShoppingCart className="size-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount ? <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{cartCount}</span> : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Open profile menu">
              <Menu className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-primary-text">Account</p>
              <p className="text-xs text-secondary-text">{currentLocation.locality}, {currentLocation.city}</p>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/profile"><User className="size-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/orders"><Package className="size-4" /> Orders</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/wishlist"><Heart className="size-4" /> Wishlist</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile"><Settings className="size-4" /> Settings</Link>
            </DropdownMenuItem>
            <div className="border-t border-border p-2">
              <LanguageSwitcher compact />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="border-t border-border px-4 py-2 md:hidden">
        <Link href="/search" className="flex min-h-11 items-center rounded-md text-sm font-medium text-secondary-text focus-ring" aria-label={`Delivery location ${currentLocation.locality}, ${currentLocation.city}`}>
          {currentLocation.locality}, {currentLocation.city}
        </Link>
      </div>
    </header>
  );
}
