"use client";

import { motion } from "framer-motion";
import { Heart, Plus, ShoppingCart, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { upsertCartItemAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { formatEta } from "@/features/marketplace/lib/data";
import { formatLocalizedCurrency } from "@/lib/i18n/format";
import { useLocaleStore } from "@/store/locale-store";
import { useMobileStore } from "@/store/mobile-store";
import { useWishlistStore } from "@/store/wishlist-store";
import type { Product } from "@/types";
import { PriceDisplay } from "./price-display";
import { RatingDisplay } from "./rating-display";
import { SellerBadge } from "./seller-badge";
import { StockBadge } from "./stock-badge";

export function ProductCard({ product }: { product: Product; compact?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const { t } = useTranslation();
  const locale = useLocaleStore((state) => state.locale);
  const isOnline = useMobileStore((state) => state.isOnline);
  const isWishlisted = useWishlistStore((state) => state.has(product.id));
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      data-testid="product-card"
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition hover:border-emerald-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)]"
    >
      <div className="relative">
        <Link href={`/product/${product.slug}`} className="block min-h-11 focus-ring" aria-label={`View ${product.name}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                loading="lazy"
                placeholder="empty"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
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
            className="focus-ring absolute right-3 top-3 flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/95 text-secondary-text shadow-sm transition hover:text-danger"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart className={isWishlisted ? "fill-danger text-danger" : ""} />
        </button>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {discount ? <Badge variant="warning">{discount}% off</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-4">
        <div className="space-y-2">
          <Link href={`/product/${product.slug}`} className="block min-h-11">
            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-primary-text transition hover:text-brand">{product.name}</h3>
          </Link>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SellerBadge name={product.vendor.name} status={product.vendor.serviceStatus} />
            <RatingDisplay rating={product.rating} count={product.reviewCount} />
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-baseline gap-2">
              <PriceDisplay value={product.price} currency={product.currency} />
              {product.originalPrice ? <span className="whitespace-nowrap text-xs text-secondary-text line-through">{formatLocalizedCurrency(product.originalPrice, product.currency, locale)}</span> : null}
            </div>
            <p className="mt-1 text-xs text-secondary-text">{product.unit}</p>
          </div>
          <StockBadge count={product.stockCount} />
        </div>

        <div className="flex min-w-0 items-center justify-between gap-2 text-xs text-secondary-text">
          <span className="inline-flex items-center gap-1">
            <Truck className="size-3.5" /> {formatEta(product.deliveryMinutes)}
          </span>
          <span className="shrink-0">{product.vendor.locality}</span>
        </div>

        <Button
          className="min-h-11 w-full"
          size="sm"
          data-testid="add-to-cart"
          aria-label={product.stockCount <= 0 ? t("product.out_of_stock") : t("product.add_to_cart")}
          disabled={product.stockCount <= 0 || !isOnline || isPending}
          onClick={() =>
            startTransition(async () => {
              await upsertCartItemAction({ product_id: product.id, quantity: 1 });
            })
          }
        >
          {product.stockCount <= 0 ? (
            t("product.out_of_stock")
          ) : !isOnline ? (
            "Connect to add"
          ) : isPending ? (
            "Adding"
          ) : (
            <>
              <ShoppingCart /> Quick add <Plus className="size-3" />
            </>
          )}
        </Button>
      </div>
    </motion.article>
  );
}
