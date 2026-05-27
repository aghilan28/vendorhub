import { Button } from "@/components/ui/button";
import { PriceDisplay } from "./price-display";

export function CheckoutSummaryCard({ subtotal = 0, delivery = 0 }: { subtotal?: number; delivery?: number }) {
  const total = subtotal + delivery;
  return (
    <aside className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-primary-text">Checkout summary</h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-secondary-text">Subtotal</dt>
          <dd><PriceDisplay value={subtotal} /></dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-secondary-text">Delivery</dt>
          <dd><PriceDisplay value={delivery} /></dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <dt className="font-medium text-primary-text">Total</dt>
          <dd><PriceDisplay value={total} /></dd>
        </div>
      </dl>
      <Button className="mt-4 w-full">Continue</Button>
    </aside>
  );
}
