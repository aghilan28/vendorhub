import type { AppLocale } from "./config";

export const invoiceLabels: Record<AppLocale, Record<string, string>> = {
  en: {
    invoice: "Tax invoice",
    gstin: "GSTIN",
    seller: "Seller",
    buyer: "Buyer",
    taxableValue: "Taxable value",
    cgst: "CGST",
    sgst: "SGST",
    igst: "IGST",
    delivery: "Delivery fee",
    discount: "Discount",
    total: "Total",
    paymentMode: "Payment mode",
    transactionReference: "Transaction reference",
  },
  ta: {
    invoice: "வரி invoice",
    gstin: "GSTIN",
    seller: "விற்பனையாளர்",
    buyer: "வாங்குபவர்",
    taxableValue: "வரி மதிப்பு",
    cgst: "CGST",
    sgst: "SGST",
    igst: "IGST",
    delivery: "டெலிவரி கட்டணம்",
    discount: "தள்ளுபடி",
    total: "மொத்தம்",
    paymentMode: "கட்டண முறை",
    transactionReference: "பரிவர்த்தனை குறிப்பு",
  },
  hi: {
    invoice: "Tax invoice",
    gstin: "GSTIN",
    seller: "Seller",
    buyer: "Buyer",
    taxableValue: "Taxable value",
    cgst: "CGST",
    sgst: "SGST",
    igst: "IGST",
    delivery: "Delivery fee",
    discount: "Discount",
    total: "Total",
    paymentMode: "Payment mode",
    transactionReference: "Transaction reference",
  },
};

export function getInvoiceLabels(locale: AppLocale) {
  return invoiceLabels[locale] ?? invoiceLabels.en;
}
