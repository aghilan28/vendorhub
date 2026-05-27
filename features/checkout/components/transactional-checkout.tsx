"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeIndianRupee, CreditCard, Home, Loader2, PackageCheck, QrCode, RotateCcw, ShieldCheck, Smartphone, Truck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceDisplay } from "@/components/commerce/price-display";
import { TrustStrip } from "@/components/experience/trust-strip";
import { useCartStore } from "@/store/cart-store";
import { useCheckoutStore } from "@/store/checkout-store";
import { useMobileStore } from "@/store/mobile-store";
import { useAtomicCheckoutMutation } from "@/features/transactions/atomic-client";
import { calculateOrderPricing } from "@/features/transactions/pricing";
import { TransactionSummary } from "@/features/transactions/components/transaction-summary";
import { checkCodEligibility, codTrustMessage } from "@/features/commerce-finance/cod";
import { buildQrPlaceholder, upiApps } from "@/features/commerce-finance/upi";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const CheckoutSchema = z.object({
  addressId: z.string().min(1),
  deliverySlot: z.string().min(2),
  paymentMethod: z.enum(["upi", "cod", "card", "netbanking", "wallet"]),
  upiApp: z.enum(["gpay", "phonepe", "paytm", "bhim", "generic"]),
  orderNote: z.string().max(160).optional(),
});

export function TransactionalCheckout() {
  const { t } = useTranslation();
  const { items, clearCart } = useCartStore();
  const isOnline = useMobileStore((state) => state.isOnline);
  const connectionLabel = useMobileStore((state) => state.connectionLabel);
  const {
    addresses,
    selectedAddressId,
    deliverySlot,
    paymentMethod,
    upiApp,
    lastError,
    isProcessing,
    lastOrderId,
    atomicProgress,
    setSelectedAddress,
    setDeliverySlot,
    setPaymentMethod,
    setUpiApp,
    failAtomicCheckout,
  } = useCheckoutStore();
  const atomicCheckout = useAtomicCheckoutMutation();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? addresses[0];
  const pricing = calculateOrderPricing(items);
  const codEligibility = checkCodEligibility({ items, total: pricing.total, pincode: selectedAddress.pincode });
  const form = useForm<any>({
    resolver: zodResolver(CheckoutSchema as any),
    values: { addressId: selectedAddress.id, deliverySlot, paymentMethod, upiApp, orderNote: "" },
  });

  async function onSubmit(values: any) {
    const address = addresses.find((item) => item.id === values.addressId) ?? selectedAddress;
    const result = await atomicCheckout.mutateAsync({ address, deliverySlot: values.deliverySlot, paymentMethod: values.paymentMethod, orderNote: values.orderNote });

    if (values.paymentMethod === "cod") {
      clearCart();
      return;
    }

    const liveOrderResponse = await fetch("/api/payments/razorpay/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transactionId: result.transactionId }),
    });

    if (!liveOrderResponse.ok) {
      const body = await liveOrderResponse.json().catch(() => null);
      failAtomicCheckout(body?.error ?? "Unable to create the live Razorpay order.");
      return;
    }

    const liveOrder = await liveOrderResponse.json() as {
      keyId?: string;
      order: { id: string; amount: number; currency: string };
    };

    if (!liveOrder.keyId) {
      failAtomicCheckout("Razorpay public key is not configured for checkout.");
      return;
    }

    try {
      await openRazorpayCheckout({
        key: liveOrder.keyId,
        amount: liveOrder.order.amount,
        currency: liveOrder.order.currency,
        name: "VendorHub",
        description: `Payment for ${result.orderNumbers.join(", ")}`,
        order_id: liveOrder.order.id,
        notes: {
          transactionId: result.transactionId,
          orderNumbers: result.orderNumbers.join(","),
        },
        theme: { color: "#047857" },
        handler: async (response) => {
          const verifyResponse = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (!verifyResponse.ok) {
            const body = await verifyResponse.json().catch(() => null);
            failAtomicCheckout(body?.error ?? "Payment verification failed. Fulfillment will wait for reconciliation.");
            return;
          }

          clearCart();
        },
        modal: {
          ondismiss: () => failAtomicCheckout("Payment window was closed. Your transaction is recoverable and retry-safe."),
        },
      });
    } catch (error) {
      failAtomicCheckout(error instanceof Error ? error.message : "Razorpay checkout could not be opened.");
    }
  }

  if (atomicProgress.state === "payment_pending") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6" role="status" aria-live="polite">
        <ShieldCheck className="size-10 text-amber-700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-primary-text">Payment confirmation pending</h2>
        <p className="mt-2 max-w-2xl text-sm text-secondary-text">
          Your order is being confirmed. We will show it in your order history as soon as payment is verified.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" asChild><Link href="/orders">Order history</Link></Button>
        </div>
      </div>
    );
  }

  if (lastOrderId && atomicProgress.state === "confirmed") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <PackageCheck className="size-10 text-brand" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-primary-text">Order confirmed</h2>
        <p className="mt-2 max-w-2xl text-sm text-secondary-text">
          Your payment is confirmed and the seller has received the order.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild><Link href={`/orders/${lastOrderId}`}>View order</Link></Button>
          <Button variant="secondary" asChild><Link href="/orders">Order history</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <TrustStrip
          label="Checkout trust"
          items={[
            { label: "Cart", value: items.length ? "Ready" : "Empty", icon: PackageCheck },
            { label: "Payment", value: paymentMethod === "cod" ? "COD available" : "Secure payment", icon: ShieldCheck },
            { label: "Delivery", value: deliverySlot, icon: Truck },
            { label: "Refunds", value: "Easy order support", icon: RotateCcw },
          ]}
        />
        {!isOnline ? (
          <Alert title="Checkout paused offline" variant="warning">
            <p>Your cart remains available, but orders, UPI handoff, COD checks, and payment verification need a connection.</p>
          </Alert>
        ) : ["slow-2g", "2g", "3g", "data saver"].includes(connectionLabel) ? (
          <Alert title="Slow connection" variant="info">
            <p>Keep this screen open while your order is placed.</p>
          </Alert>
        ) : null}

        {lastError ? (
          <Alert title={lastError.title} variant="danger">
            <p>{lastError.message}</p>
            <p className="mt-1 font-medium">{lastError.recoveryAction}</p>
          </Alert>
        ) : null}

        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Home className="size-4" /> Delivery address</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <label key={address.id} className="min-h-24 rounded-lg border border-border p-3 text-sm focus-within:ring-2 focus-within:ring-brand">
                <input
                  type="radio"
                  value={address.id}
                  className="mr-2"
                  {...form.register("addressId", { onChange: (event) => setSelectedAddress(event.target.value) })}
                />
                <span className="font-medium text-primary-text">{address.label}</span>
                <span className="mt-2 block break-words text-secondary-text">{address.recipient}, {address.line1}, {address.locality}, {address.city} {address.pincode}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Truck className="size-4" /> Delivery slot</h2>
          <select
            className="focus-ring mt-4 h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
            aria-label="Delivery slot"
            {...form.register("deliverySlot", { onChange: (event) => setDeliverySlot(event.target.value) })}
          >
            <option>Fastest available</option>
            <option>Today, 6 PM - 8 PM</option>
            <option>Tomorrow morning</option>
          </select>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><PackageCheck className="size-4" /> Order review</h2>
          <div className="mt-4 space-y-2">
            {items.length ? items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-primary-text">{item.product.name}</p>
                  <p className="text-xs text-secondary-text">{item.product.vendor.name} x {item.quantity}</p>
                </div>
                <PriceDisplay value={item.product.price * item.quantity} currency={item.product.currency} />
              </div>
            )) : <p className="text-sm text-secondary-text">Your cart is empty.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Smartphone className="size-4" /> India payment mode</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(["upi", "cod", "card", "netbanking", "wallet"] as const).map((method) => (
              <label key={method} className="min-h-12 rounded-lg border border-border p-3 text-sm uppercase focus-within:ring-2 focus-within:ring-brand">
                <input type="radio" value={method} className="mr-2" {...form.register("paymentMethod", { onChange: (event) => setPaymentMethod(event.target.value) })} />
                {method}
              </label>
            ))}
          </div>
          {paymentMethod === "upi" ? (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-primary-text"><QrCode className="size-4 text-brand" /> UPI app handoff</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {upiApps.map((app) => (
                      <label key={app.id} className="rounded-md border border-emerald-200 bg-white px-2 py-2 text-xs font-medium text-primary-text focus-within:ring-2 focus-within:ring-brand">
                        <input type="radio" value={app.id} className="mr-1" {...form.register("upiApp", { onChange: (event) => setUpiApp(event.target.value) })} />
                        {app.label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-emerald-800">{upiApps.find((app) => app.id === upiApp)?.trustMessage}</p>
                </div>
                <div className="flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed border-emerald-300 bg-white text-center">
                  <QrCode className="size-8 text-brand" />
                  <p className="mt-2 font-mono text-xs text-secondary-text">{buildQrPlaceholder("KX-NEXT")}</p>
                </div>
              </div>
            </div>
          ) : null}
          {paymentMethod === "cod" ? (
            <div className={`mt-4 rounded-lg border p-3 text-sm ${codEligibility.eligible ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <p className="flex items-center gap-2 font-medium"><BadgeIndianRupee className="size-4" /> {codTrustMessage(codEligibility)}</p>
              <p className="mt-1 text-xs">COD max limit Rs {codEligibility.maxAmount.toLocaleString("en-IN")}. Seller and pincode restrictions are checked before order confirmation.</p>
            </div>
          ) : null}
          <Input className="mt-4" placeholder="Add delivery instructions" {...form.register("orderNote")} />
          <p className="mt-3 flex items-center gap-2 text-xs text-secondary-text"><ShieldCheck className="size-4 text-brand" /> Your payment is checked before the seller starts packing.</p>
        </section>
      </div>

      <div className="space-y-3">
        <TransactionSummary pricing={pricing} itemCount={items.length} />
        <Button className="min-h-12 w-full" type="submit" disabled={!items.length || isProcessing || atomicCheckout.isPending || !isOnline}>
          <span data-testid="checkout-btn" className="contents">
          {isProcessing || atomicCheckout.isPending ? <Loader2 className="animate-spin" /> : paymentMethod === "cod" ? <WalletCards /> : <CreditCard />}
          {!isOnline ? t("error.offline") : isProcessing || atomicCheckout.isPending ? "Placing order" : paymentMethod === "cod" ? t("payment.cod") : paymentMethod === "upi" ? t("payment.upi") : t("payment.pay_now")}
          </span>
        </Button>
        {lastError?.code === "PAYMENT_FAILED" ? (
          <Button className="w-full" type="submit" variant="secondary" disabled={isProcessing}>
            <RotateCcw /> Retry payment
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-vendorhub-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Razorpay checkout script failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.vendorhubRazorpay = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay checkout script failed to load."));
    document.body.appendChild(script);
  });
}

async function openRazorpayCheckout(options: RazorpayCheckoutOptions) {
  await loadRazorpayScript();
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout is unavailable.");
  }

  new window.Razorpay(options).open();
}
