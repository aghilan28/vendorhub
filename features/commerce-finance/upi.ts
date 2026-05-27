import type { MoneyBreakdown } from "@/types";
import type { UpiAppId, UpiAppOption } from "./types";

export const upiApps: UpiAppOption[] = [
  { id: "gpay", label: "GPay", packageHint: "tez", trustMessage: "Opens Google Pay with the amount locked." },
  { id: "phonepe", label: "PhonePe", packageHint: "phonepe", trustMessage: "Handoff to PhonePe UPI collect flow." },
  { id: "paytm", label: "Paytm", packageHint: "paytmmp", trustMessage: "Use Paytm UPI or wallet UPI rails." },
  { id: "bhim", label: "BHIM", packageHint: "bhim", trustMessage: "Works with BHIM and bank UPI apps." },
  { id: "generic", label: "Any UPI app", packageHint: "upi", trustMessage: "Shows the standard UPI app chooser." },
];

export function buildUpiDeepLink({
  pricing,
  orderCode,
  app = "generic",
}: {
  pricing: MoneyBreakdown;
  orderCode: string;
  app?: UpiAppId;
}) {
  const params = new URLSearchParams({
    pa: "vendorhub@razorpay",
    pn: "VendorHub",
    tr: `VH${orderCode.replace(/\D/g, "")}`,
    tn: `VendorHub order ${orderCode}`,
    am: pricing.total.toFixed(2),
    cu: "INR",
  });
  const uri = `upi://pay?${params.toString()}`;
  if (app === "gpay") return `tez://upi/pay?${params.toString()}`;
  if (app === "phonepe") return `phonepe://pay?${params.toString()}`;
  if (app === "paytm") return `paytmmp://pay?${params.toString()}`;
  return uri;
}

export function buildQrPlaceholder(orderCode: string) {
  return `VH-QR-${orderCode.replace(/\D/g, "")}-UPI`;
}
