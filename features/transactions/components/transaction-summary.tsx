import { ShieldCheck, Truck } from "lucide-react";
import type { MoneyBreakdown } from "@/types";
import { PriceDisplay } from "@/components/commerce/price-display";

export function TransactionSummary({ pricing, itemCount }: { pricing: MoneyBreakdown; itemCount: number }) {
  return (
    <aside className="h-fit rounded-lg border border-border bg-surface p-4 shadow-sm lg:sticky lg:top-24">
      <h2 className="font-semibold text-primary-text">Order summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-secondary-text">Items</dt><dd>{itemCount}</dd></div>
        <div className="flex justify-between"><dt className="text-secondary-text">Subtotal</dt><dd><PriceDisplay value={pricing.subtotal} currency={pricing.currency} /></dd></div>
        <div className="flex justify-between"><dt className="text-secondary-text">CGST</dt><dd><PriceDisplay value={pricing.cgst ?? 0} currency={pricing.currency} /></dd></div>
        <div className="flex justify-between"><dt className="text-secondary-text">SGST</dt><dd><PriceDisplay value={pricing.sgst ?? 0} currency={pricing.currency} /></dd></div>
        <div className="flex justify-between"><dt className="text-secondary-text">Delivery</dt><dd>{pricing.delivery ? <PriceDisplay value={pricing.delivery} currency={pricing.currency} /> : "Free"}</dd></div>
        <div className="flex justify-between"><dt className="text-secondary-text">Discounts</dt><dd>-<PriceDisplay value={pricing.discount} currency={pricing.currency} /></dd></div>
        <div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>Total payable</dt><dd><PriceDisplay value={pricing.total} currency={pricing.currency} /></dd></div>
      </dl>
      <div className="mt-4 space-y-2 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
        <p className="flex items-center gap-2"><ShieldCheck className="size-4" /> Razorpay verification and GST invoice ready</p>
        <p className="flex items-center gap-2"><Truck className="size-4" /> UPI and COD status stay visible after checkout</p>
      </div>
    </aside>
  );
}
