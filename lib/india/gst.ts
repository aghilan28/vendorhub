import { getHSN } from "./hsn-codes";

export function calculateGST(params: {
  subtotal: number;
  categorySlug: string;
  sellerState: string;
  buyerState: string;
}) {
  const { hsn, rate } = getHSN(params.categorySlug);
  const gstAmount = Math.round((params.subtotal * rate) / 100);
  const isInterState = params.sellerState.trim().toLowerCase() !== params.buyerState.trim().toLowerCase();

  return {
    hsn,
    rate,
    gstAmount,
    cgst: isInterState ? 0 : gstAmount / 2,
    sgst: isInterState ? 0 : gstAmount / 2,
    igst: isInterState ? gstAmount : 0,
    isInterState,
    total: params.subtotal + gstAmount,
  };
}
