"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { upsertCartItemAction } from "@/lib/actions/cart";
import type { Product } from "@/types";

export function ProductAddActions({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const max = Math.max(1, product.stockCount);

  return (
    <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
      <div className="inline-flex h-11 items-center justify-between rounded-md border border-border bg-surface">
        <Button variant="ghost" size="icon" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></Button>
        <span className="text-sm font-semibold">{quantity}</span>
        <Button variant="ghost" size="icon" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(max, value + 1))}><Plus /></Button>
      </div>
      <Button
        className="h-11"
        disabled={product.stockCount <= 0 || isPending}
        onClick={() =>
          startTransition(async () => {
            await upsertCartItemAction({ product_id: product.id, quantity });
          })
        }
      >
        <ShoppingCart /> {isPending ? "Adding..." : "Add to cart"}
      </Button>
    </div>
  );
}
