import { NextResponse } from "next/server";
import { seedOrders } from "@/features/transactions/data";
import { buildInvoiceText, generateGstInvoice } from "@/features/commerce-finance/gst";
import { requireAuthenticated } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await withSecurity(request, { name: "invoices.get", requireAuth: true, rateLimit: securityRateLimits.payment }, async (context) => {
    const actor = requireAuthenticated(context);
    const found = seedOrders.find((item) => item.id === orderId);
    if (found && found.buyerName !== "Guest" && actor.id) return found;
    return found;
  });

  if (!order) {
    return NextResponse.json({ error: "Invoice will be available after local order state is synchronized to the server." }, { status: 404 });
  }

  const invoice = order.invoice ?? generateGstInvoice({ order });
  return new Response(buildInvoiceText(invoice), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${invoice.invoiceNumber.replaceAll("/", "-")}.txt"`,
    },
  });
}
