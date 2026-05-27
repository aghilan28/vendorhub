import type { CartItem, GstInvoice, GstInvoiceLine, GstParty, MoneyBreakdown } from "@/types";
import type { FinanceOrderInput, InvoiceGenerationInput, SellerTaxProfile } from "./types";

export const DEFAULT_GST_RATE = 5;

export const vendorhubTaxProfile: GstParty = {
  name: "VendorHub Commerce Services",
  gstin: "29AABCV2606H1ZP",
  address: "Indiranagar Marketplace Operations Desk",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560038",
};

export const sellerTaxProfiles: SellerTaxProfile[] = [
  {
    sellerId: "vendor-fresh-basket",
    sellerName: "Fresh Basket Malleswaram",
    legalName: "Fresh Basket Retail LLP",
    gstin: "29AAFCF1042K1Z6",
    gstVerification: "verified_placeholder",
    address: "8th Cross, Malleswaram",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560003",
  },
  {
    sellerId: "vendor-home-needs",
    sellerName: "Home Needs Indiranagar",
    legalName: "Home Needs Local Mart",
    gstin: "29AAHCH1038M1Z8",
    gstVerification: "pending_placeholder",
    address: "CMH Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
  },
];

export function calculateIndiaTaxBreakdown(subtotal: number, gstRate = DEFAULT_GST_RATE): Pick<MoneyBreakdown, "tax" | "cgst" | "sgst" | "igst"> {
  const tax = Math.round(subtotal * (gstRate / 100));
  return {
    tax,
    cgst: Math.round(tax / 2),
    sgst: tax - Math.round(tax / 2),
    igst: 0,
  };
}

export function getSellerTaxProfile(items: CartItem[]): SellerTaxProfile {
  const vendor = items[0]?.product.vendor;
  return (
    sellerTaxProfiles.find((profile) => profile.sellerName === vendor?.name || profile.sellerId === vendor?.id) ?? {
      sellerId: vendor?.id ?? "mixed-seller",
      sellerName: vendor?.name ?? "Mixed local sellers",
      legalName: vendor?.name ?? "Mixed local sellers",
      gstVerification: "pending_placeholder",
      address: vendor?.locality ?? "Local commerce cluster",
      city: vendor?.city ?? "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    }
  );
}

function toSellerParty(profile: SellerTaxProfile): GstParty {
  return {
    name: profile.legalName,
    gstin: profile.gstin,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    pincode: profile.pincode,
  };
}

function toBuyerParty(order: FinanceOrderInput): GstParty {
  return {
    name: order.buyerName,
    address: `${order.deliveryAddress.line1}, ${order.deliveryAddress.locality}`,
    city: order.deliveryAddress.city,
    state: "Karnataka",
    pincode: order.deliveryAddress.pincode,
  };
}

export function generateInvoiceNumber(orderCode: string, issuedAt = new Date()) {
  const year = issuedAt.getFullYear();
  const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
  return `VH/${year}-${month}/${orderCode.replace("KX-", "")}`;
}

export function generateGstInvoice({ order, sellerProfile = getSellerTaxProfile(order.items) }: InvoiceGenerationInput): GstInvoice {
  const issuedAt = new Date(order.createdAt);
  const lines: GstInvoiceLine[] = order.items.map((item) => {
    const taxableValue = item.product.price * item.quantity;
    const tax = Math.round(taxableValue * (DEFAULT_GST_RATE / 100));
    const cgst = Math.round(tax / 2);
    const sgst = tax - cgst;
    return {
      id: `line-${order.code}-${item.product.id}`,
      description: item.product.name,
      hsnSac: item.product.category.slug.includes("service") ? "998599" : "210690",
      quantity: item.quantity,
      taxableValue,
      gstRate: DEFAULT_GST_RATE,
      cgst,
      sgst,
      igst: 0,
      total: taxableValue + tax,
    };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.taxableValue, 0);
  const cgst = lines.reduce((sum, line) => sum + line.cgst, 0);
  const sgst = lines.reduce((sum, line) => sum + line.sgst, 0);
  const igst = lines.reduce((sum, line) => sum + line.igst, 0);
  const invoiceNumber = generateInvoiceNumber(order.code, issuedAt);

  return {
    id: `invoice-${order.id}`,
    invoiceNumber,
    orderId: order.id,
    issuedAt: issuedAt.toISOString(),
    seller: toSellerParty(sellerProfile),
    buyer: toBuyerParty(order),
    lines,
    subtotal,
    cgst,
    sgst,
    igst,
    delivery: order.pricing.delivery,
    discount: order.pricing.discount,
    total: order.total,
    paymentMode: order.payment.method,
    transactionReference: order.payment.reference,
    pdfUrl: `/api/invoices/${order.id}`,
    status: "download_ready",
  };
}

export function buildInvoiceText(invoice: GstInvoice) {
  const lineText = invoice.lines
    .map((line) => `${line.description} | HSN/SAC ${line.hsnSac} | Qty ${line.quantity} | Taxable Rs ${line.taxableValue} | GST ${line.gstRate}% | Total Rs ${line.total}`)
    .join("\n");

  return [
    "VendorHub GST Invoice",
    `Invoice: ${invoice.invoiceNumber}`,
    `Issued: ${new Date(invoice.issuedAt).toLocaleString("en-IN")}`,
    `Seller: ${invoice.seller.name}${invoice.seller.gstin ? ` | GSTIN ${invoice.seller.gstin}` : ""}`,
    `Buyer: ${invoice.buyer.name}`,
    "",
    lineText,
    "",
    `Subtotal: Rs ${invoice.subtotal}`,
    `CGST: Rs ${invoice.cgst}`,
    `SGST: Rs ${invoice.sgst}`,
    `IGST: Rs ${invoice.igst}`,
    `Delivery: Rs ${invoice.delivery}`,
    `Discount: Rs ${invoice.discount}`,
    `Total: Rs ${invoice.total}`,
    `Payment: ${invoice.paymentMode.toUpperCase()} | Ref ${invoice.transactionReference}`,
  ].join("\n");
}
