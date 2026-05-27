import type { CartItem } from "@/types";
import { PriceDisplay } from "./price-display";
import { QuantitySelector } from "./quantity-selector";

export function CartItemCard({ item }: { item: CartItem }) {
  return (
    <article className="flex gap-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="size-20 rounded-md bg-slate-100" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-primary-text">{item.product.name}</h3>
        <p className="mt-1 text-xs text-secondary-text">{item.product.vendor.name}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantitySelector value={item.quantity} />
          <PriceDisplay value={item.product.price * item.quantity} currency={item.product.currency} />
        </div>
      </div>
    </article>
  );
}
