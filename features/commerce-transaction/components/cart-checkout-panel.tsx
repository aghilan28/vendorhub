"use client";

// MCP-0F.2 / 0F.3 — Cart & Checkout intelligence panel.
// An interactive, engine-driven surface: multi-seller grouping, inventory /
// price / promotion validation, save-for-later, coupon application, delivery
// option and a live priced checkout quote (subtotal → discount → GST → total).
// Pure engine in local state; works on sample or live cart lines.

import { useMemo, useState } from "react";
import { BadgeIndianRupee, BookmarkPlus, ShoppingCart, Tag, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import {
  DELIVERY_OPTIONS,
  applicableCoupons,
  buildCheckoutQuote,
  moveToCart,
  saveForLater,
  validateCart,
  type CartLine,
  type Coupon,
} from "@/lib/commerce-transaction";

export function CartCheckoutPanel({ lines: initialLines, coupons, sampled }: { lines: CartLine[]; coupons: Coupon[]; sampled: boolean }) {
  const [lines, setLines] = useState<CartLine[]>(initialLines);
  const [couponCode, setCouponCode] = useState("");
  const [deliveryOptionId, setDeliveryOptionId] = useState("standard");

  const validation = useMemo(() => validateCart(lines, { couponCode, coupons }), [lines, couponCode, coupons]);
  const quote = useMemo(
    () => buildCheckoutQuote(validation, { couponCode, coupons, deliveryOptionId }),
    [validation, couponCode, coupons, deliveryOptionId],
  );
  const offers = useMemo(
    () => applicableCoupons(coupons, { subtotal: validation.totals.subtotal, sellerIds: validation.groups.map((g) => g.sellerId) }),
    [coupons, validation],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-primary-text"><ShoppingCart className="size-4" /> Cart & checkout intelligence</h2>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live data"}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {validation.groups.map((group) => (
            <GovernanceCard key={group.sellerId} title={group.sellerName} description={`${group.itemCount} item(s) · ₹${group.subtotal.toLocaleString("en-IN")}`}>
              <div className="space-y-2">
                {group.lines.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                    <div>
                      <p className="font-medium text-primary-text">{line.name}</p>
                      <p className="text-xs text-secondary-text">₹{line.unitPrice.toLocaleString("en-IN")} × {line.quantity}{line.available <= line.lowStockThreshold ? " · low stock" : ""}</p>
                    </div>
                    <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => setLines((current) => saveForLater(current, line.id))}>
                      <BookmarkPlus className="size-3" /> Save
                    </Button>
                  </div>
                ))}
              </div>
            </GovernanceCard>
          ))}

          {validation.saved.length ? (
            <GovernanceCard title="Saved for later" description="Move items back to your cart anytime.">
              <div className="space-y-2">
                {validation.saved.map((line) => (
                  <div key={line.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                    <span className="text-primary-text">{line.name}</span>
                    <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => setLines((current) => moveToCart(current, line.id))}>Move to cart</Button>
                  </div>
                ))}
              </div>
            </GovernanceCard>
          ) : null}

          {validation.issues.length ? (
            <GovernanceCard title="Cart checks">
              <ul className="space-y-1 text-xs">
                {validation.issues.map((issue, i) => (
                  <li key={i} className={issue.severity === "critical" ? "text-red-700" : issue.severity === "warning" ? "text-amber-700" : "text-secondary-text"}>
                    • {issue.message}
                  </li>
                ))}
              </ul>
            </GovernanceCard>
          ) : null}
        </div>

        <div className="space-y-4">
          <GovernanceCard title="Coupon" action={<Tag className="size-4 text-secondary-text" />}>
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Enter code" className="h-9" />
            </div>
            {quote.coupon ? (
              <p className={`mt-2 text-xs ${quote.coupon.applied ? "text-emerald-700" : "text-amber-700"}`}>{quote.coupon.reason}</p>
            ) : null}
            {offers.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offers.map((offer) => (
                  <button key={offer.code} type="button" onClick={() => setCouponCode(offer.code)} className="focus-ring">
                    <Badge variant="ai">{offer.code}</Badge>
                  </button>
                ))}
              </div>
            ) : null}
          </GovernanceCard>

          <GovernanceCard title="Delivery" action={<Truck className="size-4 text-secondary-text" />}>
            <select
              className="focus-ring h-10 w-full rounded-md border border-border bg-surface px-3 text-sm"
              aria-label="Delivery option"
              value={deliveryOptionId}
              onChange={(e) => setDeliveryOptionId(e.target.value)}
            >
              {DELIVERY_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}{option.fee ? ` · ₹${option.fee}` : " · free"}</option>
              ))}
            </select>
          </GovernanceCard>

          <GovernanceCard title="Order summary" action={<BadgeIndianRupee className="size-4 text-secondary-text" />}>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={`₹${quote.subtotal.toLocaleString("en-IN")}`} />
              {quote.discount ? <Row label="Discount" value={`− ₹${quote.discount.toLocaleString("en-IN")}`} accent="text-emerald-700" /> : null}
              <Row label={`GST (${quote.tax.gstRate}%)`} value={`₹${quote.tax.tax.toLocaleString("en-IN")}`} />
              <Row label="Delivery" value={quote.deliveryFee ? `₹${quote.deliveryFee}` : "Free"} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-primary-text">
                <span>Total</span><span>₹{quote.total.toLocaleString("en-IN")}</span>
              </div>
            </dl>
            <Button className="mt-3 w-full" disabled={!validation.ok}>{validation.ok ? "Proceed to checkout" : "Resolve cart issues"}</Button>
          </GovernanceCard>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-secondary-text">{label}</dt>
      <dd className={accent ?? "text-primary-text"}>{value}</dd>
    </div>
  );
}
