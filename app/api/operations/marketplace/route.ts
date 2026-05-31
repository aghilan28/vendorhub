/**
 * MCP-1E — Marketplace Operations API
 * GET: Returns full operations snapshot (support, disputes, incidents, fulfillment, refunds, sellers, customers, intelligence)
 */

import { NextResponse } from "next/server";
import {
  computeCustomerOperationsSnapshot,
  computeDisputeAnalytics,
  computeFulfillmentSnapshot,
  computeIncidentAnalytics,
  computeMarketplaceOperationsSnapshot,
  computeOperationalIntelligence,
  computeRefundAnalytics,
  computeSellerOperationsSnapshot,
  computeSupportAnalytics,
  SEED_CANCELLATIONS,
  SEED_CUSTOMER_ISSUES,
  SEED_CUSTOMERS,
  SEED_DISPUTES,
  SEED_FULFILLMENT_ORDERS,
  SEED_INCIDENTS,
  SEED_REFUND_REQUESTS,
  SEED_SELLERS,
  SEED_TICKETS,
  SEED_VIOLATIONS,
} from "@/lib/marketplace-operations";

export async function GET() {
  try {
    // Compute all domain analytics
    const support = computeSupportAnalytics(SEED_TICKETS);
    const disputes = computeDisputeAnalytics(SEED_DISPUTES);
    const incidents = computeIncidentAnalytics(SEED_INCIDENTS);
    const fulfillment = computeFulfillmentSnapshot(SEED_FULFILLMENT_ORDERS);
    const sellers = computeSellerOperationsSnapshot(SEED_SELLERS, SEED_VIOLATIONS);
    const customers = computeCustomerOperationsSnapshot(SEED_CUSTOMERS, SEED_CUSTOMER_ISSUES);
    const refunds = computeRefundAnalytics(SEED_REFUND_REQUESTS);

    // Compute unified operations snapshot
    const snapshot = computeMarketplaceOperationsSnapshot({ support, disputes, incidents, fulfillment, sellers, customers, refunds });

    // Compute operational intelligence
    const intelligence = computeOperationalIntelligence({
      support, disputes, incidents, fulfillment, sellers, customers, refunds,
      healthScores: snapshot.healthByDomain,
    });

    return NextResponse.json({
      success: true,
      sampled: true,
      snapshot,
      intelligence,
      cancellations: SEED_CANCELLATIONS,
      rawData: {
        tickets: SEED_TICKETS.length,
        disputes: SEED_DISPUTES.length,
        incidents: SEED_INCIDENTS.length,
        fulfillmentOrders: SEED_FULFILLMENT_ORDERS.length,
        refundRequests: SEED_REFUND_REQUESTS.length,
        customers: SEED_CUSTOMERS.length,
        sellers: SEED_SELLERS.length,
        violations: SEED_VIOLATIONS.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Operations snapshot computation failed" }, { status: 500 });
  }
}
