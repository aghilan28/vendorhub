"use client";

import { motion } from "framer-motion";
import { Heart, ShoppingCart, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { upsertCartItemAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { formatEta, getProductActivityLine, getProductFreshnessLine } from "@/features/marketplace/lib/data";
import { formatLocalizedCurrency } from "@/lib/i18n/format";
import { useLocaleStore } from "@/store/locale-store";
import { useMobileStore } from "@/store/mobile-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { Product } from "@/types";
import { PriceDisplay } from "./price-display";

export function ProductCard({ product }: { product: Product; compact?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const isOnline = useMobileStore((state) => state.isOnline);
  const isWishlisted = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const isUnavailable = product.stockCount <= 0;
  const stockLabel = isUnavailable ? "Out of stock" : product.stockCount < 5 ? "Low stock" : "In stock";

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-testid="product-card"
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-[0_18px_38px_rgba(15,23,42,0.14)]"
    >
      <div className="relative p-2 pb-0">
        <Link href={`/product/${product.slug}`} className="block min-h-11 focus-ring" aria-label={`View ${product.name}`}>
          <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                loading="lazy"
                placeholder="empty"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition duration-300 ease-out group-hover:scale-[1.05]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-medium text-secondary-text">Product image</div>
            )}
          </div>
        </Link>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await toggleWishlistAction(product.id);
              toggleWishlist(product.id);
            })
          }
          className="focus-ring absolute right-2 top-2 flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/95 text-secondary-text shadow-sm transition hover:text-danger"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={`size-4 ${isWishlisted ? "fill-danger text-danger" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <Link href={`/product/${product.slug}`} className="block min-h-11">
            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-primary-text transition hover:text-brand sm:text-[15px]">{product.name}</h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-xs text-secondary-text">{getProductFreshnessLine(product)}</p>
        </div>

        <div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-xl font-semibold leading-none text-primary-text sm:text-2xl">
                <PriceDisplay value={product.price} currency={product.currency} />
              </span>
              {product.originalPrice ? <span className="whitespace-nowrap text-xs text-secondary-text line-through">{formatLocalizedCurrency(product.originalPrice, product.currency, locale)}</span> : null}
            </div>
          </div>
        </div>

        <Button
          className="mt-auto min-h-11 w-full text-sm font-semibold"
          size="sm"
          data-testid="add-to-cart"
          aria-label={isUnavailable ? t("product.out_of_stock") : t("product.add_to_cart")}
          disabled={isUnavailable || !isOnline || isPending}
          onClick={() =>
            startTransition(async () => {
              await upsertCartItemAction({ product_id: product.id, quantity: 1 });
            })
          }
        >
          {isUnavailable ? (
            t("product.out_of_stock")
          ) : !isOnline ? (
            "Connect to add"
          ) : isPending ? (
            "Adding..."
          ) : (
            <>
              <ShoppingCart className="size-4" /> Add to cart
            </>
          )}
        </Button>

        <div className="flex min-w-0 items-center justify-between gap-2 text-xs font-medium text-secondary-text">
          <span className="min-w-0 whitespace-nowrap">{formatEta(product.deliveryMinutes)}</span>
          <span className={isUnavailable ? "shrink-0 text-danger" : product.stockCount < 5 ? "shrink-0 text-amber-700" : "shrink-0 text-emerald-700"}>
            {stockLabel}
          </span>
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-secondary-text">
          <span className="min-w-0 truncate">{product.vendor.name}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary-text">
            <Star className="size-3.5 fill-warning text-warning" aria-hidden /> {product.rating.toFixed(1)}
          </span>
        </div>
        <p className="line-clamp-1 text-xs text-secondary-text">{getProductActivityLine(product)}</p>
      </div>
    </motion.article>
  );
}
