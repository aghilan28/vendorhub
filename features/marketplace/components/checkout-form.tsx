"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CreditCard, Home, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceDisplay } from "@/components/commerce/price-display";
import { useCartStore } from "@/store/cart-store";

const CheckoutSchema = z.object({
  recipient: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().min(8),
  slot: z.string().min(2),
});

export function CheckoutForm() {
  const [confirmed, setConfirmed] = useState(false);
  const { items, clearCart } = useCartStore();
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const delivery = subtotal > 499 || subtotal === 0 ? 0 : 39;
  const total = subtotal + delivery;
  const form = useForm<FieldValues>({
    resolver: zodResolver(CheckoutSchema as never),
    defaultValues: { recipient: "Ananya Rao", phone: "+91 98765 43210", address: "12, 8th Cross, Malleswaram, Bengaluru", slot: "Fastest available" },
  });

  function onSubmit() {
    setConfirmed(true);
    clearCart();
  }

  if (confirmed) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-brand" />
        <h2 className="mt-4 text-xl font-semibold text-primary-text">Order simulation confirmed</h2>
        <p className="mt-2 text-sm text-secondary-text">Payment and logistics are placeholders for later phases. The buyer checkout flow is ready.</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Home className="size-4" /> Delivery address</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input {...form.register("recipient")} aria-label="Recipient name" />
            <Input {...form.register("phone")} aria-label="Phone number" />
            <Input className="sm:col-span-2" {...form.register("address")} aria-label="Delivery address" />
          </div>
        </section>
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Truck className="size-4" /> Delivery summary</h2>
          <select className="focus-ring mt-4 h-10 w-full rounded-md border border-border bg-surface px-3 text-sm" {...form.register("slot")}>
            <option>Fastest available</option>
            <option>Today, 6 PM - 8 PM</option>
            <option>Tomorrow morning</option>
          </select>
        </section>
        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><CreditCard className="size-4" /> Payment method</h2>
          <p className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-secondary-text">Payment gateway integration is reserved. This confirms checkout UX only.</p>
        </section>
      </div>
      <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24">
        <h2 className="font-semibold text-primary-text">Pricing breakdown</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-secondary-text">Items</dt><dd>{items.length}</dd></div>
          <div className="flex justify-between"><dt className="text-secondary-text">Subtotal</dt><dd><PriceDisplay value={subtotal} /></dd></div>
          <div className="flex justify-between"><dt className="text-secondary-text">Delivery</dt><dd>{delivery ? <PriceDisplay value={delivery} /> : "Free"}</dd></div>
          <div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>Total</dt><dd><PriceDisplay value={total} /></dd></div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs text-secondary-text"><ShieldCheck className="size-4 text-brand" /> Secure checkout foundation. No payment captured.</p>
        <Button className="mt-4 w-full" type="submit" disabled={!items.length}>Confirm order simulation</Button>
      </aside>
    </form>
  );
}
