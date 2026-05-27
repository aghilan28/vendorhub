"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PriceDisplay } from "@/components/commerce/price-display";
import { TrustStrip } from "@/components/experience/trust-strip";
import { clearCartAction, removeCartItemAction, upsertCartItemAction } from "@/lib/actions/cart";
import type { CartItem } from "@/types";

export function CartClient({ items }: { items: CartItem[] }) {
  const [isPending, startTransition] = useTransition();
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const delivery = subtotal > 499 || subtotal === 0 ? 0 : 39;
  const total = subtotal + delivery;
  const grouped = items.reduce<Record<string, typeof items>>((groups, item) => {
    groups[item.product.vendor.name] = [...(groups[item.product.vendor.name] ?? []), item];
    return groups;
  }, {});

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-10 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
          <PackageCheck className="size-5 text-brand" />
        </div>
        <h2 className="text-xl font-semibold text-primary-text">Your cart is ready for nearby finds</h2>
        <p className="mt-2 text-sm text-secondary-text">Add fresh essentials, bakery items, or care products from verified local sellers.</p>
        <Button className="mt-5" asChild><Link href="/search">Browse marketplace</Link></Button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <TrustStrip
          label="Cart continuity and commerce trust indicators"
          items={[
            { label: "Seller grouping", value: `${Object.keys(grouped).length} dispatch groups`, icon: Truck },
            { label: "Stock check", value: "Revalidated at checkout", icon: ShieldCheck },
            { label: "Cart recovery", value: isPending ? "Updating safely" : "Ready for checkout", icon: PackageCheck },
            { label: "Payment", value: "No charge before confirmation", icon: ShieldCheck },
          ]}
        />
        {Object.entries(grouped).map(([vendor, vendorItems]) => (
          <section key={vendor} className="rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="min-w-0 truncate font-semibold text-primary-text">{vendor}</h2>
              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-secondary-text"><Truck className="size-3.5" /> grouped dispatch</span>
            </div>
            <div className="divide-y divide-border">
              {vendorItems.map((item) => (
                <article key={item.id} className="flex gap-3 p-4 sm:gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:size-20">
                    {item.product.imageUrl ? <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="80px" className="object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold text-primary-text">{item.product.name}</h3>
                        <p className="mt-1 text-xs text-secondary-text">{item.product.unit} · {item.product.stockCount} available</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await removeCartItemAction(item.id);
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Decrease quantity"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await upsertCartItemAction({ product_id: item.product.id, quantity: Math.max(1, item.quantity - 1) });
                            })
                          }
                        >
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Increase quantity"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              await upsertCartItemAction({ product_id: item.product.id, quantity: item.quantity + 1 });
                            })
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                      <PriceDisplay value={item.product.price * item.quantity} currency={item.product.currency} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
      <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold text-primary-text">Order summary</h2>
        <div className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-secondary-text">
          Verified seller handoff, stock recheck, and payment state are shown before confirmation.
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-secondary-text">Subtotal</dt><dd><PriceDisplay value={subtotal} /></dd></div>
          <div className="flex justify-between gap-3"><dt className="text-secondary-text">Delivery estimate</dt><dd>{delivery ? <PriceDisplay value={delivery} /> : "Free"}</dd></div>
          <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold"><dt>Total</dt><dd><PriceDisplay value={total} /></dd></div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs text-secondary-text"><ShieldCheck className="size-4 text-brand" /> Stock is rechecked before order confirmation.</p>
        <Button className="mt-4 w-full" asChild><Link href="/checkout">Continue to checkout</Link></Button>
        <Button
          className="mt-2 w-full"
          variant="ghost"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await clearCartAction();
            })
          }
        >
          Clear cart
        </Button>
      </aside>
    </div>
  );
}
