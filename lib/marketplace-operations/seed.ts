/**
 * MCP-1E — Deterministic Seed Data
 * Realistic operational data for testing and preview
 */

import type {
  CancellationRequest,
  CustomerIssue,
  CustomerProfile,
  Dispute,
  FulfillmentOrder,
  MarketplaceIncident,
  RefundRequest,
  SellerOperationsProfile,
  SellerViolation,
  SupportTicket,
} from "./types";

// ─── Support Tickets ───────────────────────────────────────────────────────────

export const SEED_TICKETS: SupportTicket[] = [
  {
    id: "tkt-001", ticketNumber: "TKT-A1B2C3D4", subject: "Order not delivered after 7 days", description: "I placed an order 7 days ago and it still shows processing. Please help.", category: "delivery_issue", priority: "high", status: "in_progress", channel: "web", createdBy: "cust-001", createdByRole: "customer", assignedTo: "agent-001", assignedTeam: "logistics_support", relatedOrderId: "ord-101", relatedProductId: null, relatedSellerId: "seller-001", tags: ["delivery", "delayed"], messages: [
      { id: "msg-001", ticketId: "tkt-001", senderId: "agent-001", senderRole: "agent", content: "Hi, I am looking into your order. Let me check with the seller.", attachments: [], isInternal: false, createdAt: "2026-05-30T10:00:00Z" },
    ], sla: { policy: { priority: "high", firstResponseMinutes: 60, resolutionMinutes: 480, escalationMinutes: 120 }, firstResponseDue: "2026-05-30T11:00:00Z", resolutionDue: "2026-05-30T18:00:00Z", firstResponseAt: "2026-05-30T10:00:00Z", isBreached: false, breachType: null }, escalationLevel: 0, resolution: null, audit: [{ id: "aud-001", timestamp: "2026-05-30T09:00:00Z", actor: "cust-001", actorRole: "customer", action: "ticket_created", detail: "Ticket created" }], createdAt: "2026-05-30T09:00:00Z", updatedAt: "2026-05-30T10:00:00Z", closedAt: null,
  },
  {
    id: "tkt-002", ticketNumber: "TKT-E5F6G7H8", subject: "Payment deducted but order failed", description: "₹2500 was deducted from my account but I got an order failure message.", category: "payment_issue", priority: "critical", status: "escalated", channel: "in_app", createdBy: "cust-002", createdByRole: "customer", assignedTo: "agent-002", assignedTeam: "payment_support", relatedOrderId: "ord-102", relatedProductId: null, relatedSellerId: null, tags: ["payment", "urgent"], messages: [], sla: { policy: { priority: "critical", firstResponseMinutes: 15, resolutionMinutes: 120, escalationMinutes: 30 }, firstResponseDue: "2026-05-30T09:15:00Z", resolutionDue: "2026-05-30T11:00:00Z", firstResponseAt: null, isBreached: true, breachType: "first_response" }, escalationLevel: 1, resolution: null, audit: [{ id: "aud-002", timestamp: "2026-05-30T09:00:00Z", actor: "cust-002", actorRole: "customer", action: "ticket_created", detail: "Ticket created" }], createdAt: "2026-05-30T09:00:00Z", updatedAt: "2026-05-30T09:45:00Z", closedAt: null,
  },
  {
    id: "tkt-003", ticketNumber: "TKT-I9J0K1L2", subject: "Wrong product received", description: "I ordered a blue shirt but received a red one.", category: "product_issue", priority: "medium", status: "resolved", channel: "email", createdBy: "cust-003", createdByRole: "customer", assignedTo: "agent-001", assignedTeam: "catalog_support", relatedOrderId: "ord-103", relatedProductId: "prod-201", relatedSellerId: "seller-002", tags: ["wrong_item"], messages: [], sla: { policy: { priority: "medium", firstResponseMinutes: 120, resolutionMinutes: 1440, escalationMinutes: 480 }, firstResponseDue: "2026-05-29T12:00:00Z", resolutionDue: "2026-05-30T10:00:00Z", firstResponseAt: "2026-05-29T11:30:00Z", isBreached: false, breachType: null }, escalationLevel: 0, resolution: { type: "resolved", summary: "Replacement shipped. Return pickup scheduled.", resolvedBy: "agent-001", resolvedAt: "2026-05-29T16:00:00Z", satisfactionScore: 4 }, audit: [], createdAt: "2026-05-29T10:00:00Z", updatedAt: "2026-05-29T16:00:00Z", closedAt: null,
  },
  {
    id: "tkt-004", ticketNumber: "TKT-M3N4O5P6", subject: "Seller not responding to messages", description: "I have been trying to contact the seller for 3 days with no response.", category: "seller_complaint", priority: "medium", status: "open", channel: "web", createdBy: "cust-004", createdByRole: "customer", assignedTo: null, assignedTeam: "seller_relations", relatedOrderId: null, relatedProductId: null, relatedSellerId: "seller-003", tags: ["seller_unresponsive"], messages: [], sla: { policy: { priority: "medium", firstResponseMinutes: 120, resolutionMinutes: 1440, escalationMinutes: 480 }, firstResponseDue: "2026-05-31T12:00:00Z", resolutionDue: "2026-06-01T10:00:00Z", firstResponseAt: null, isBreached: false, breachType: null }, escalationLevel: 0, resolution: null, audit: [], createdAt: "2026-05-31T10:00:00Z", updatedAt: "2026-05-31T10:00:00Z", closedAt: null,
  },
  {
    id: "tkt-005", ticketNumber: "TKT-Q7R8S9T0", subject: "Refund not processed for 5 days", description: "My refund was approved 5 days ago but I haven't received the money.", category: "refund_request", priority: "high", status: "assigned", channel: "in_app", createdBy: "cust-005", createdByRole: "customer", assignedTo: "agent-003", assignedTeam: "refund_team", relatedOrderId: "ord-105", relatedProductId: null, relatedSellerId: "seller-001", tags: ["refund_delayed"], messages: [], sla: { policy: { priority: "high", firstResponseMinutes: 60, resolutionMinutes: 480, escalationMinutes: 120 }, firstResponseDue: "2026-05-31T11:00:00Z", resolutionDue: "2026-05-31T18:00:00Z", firstResponseAt: null, isBreached: false, breachType: null }, escalationLevel: 0, resolution: null, audit: [], createdAt: "2026-05-31T10:00:00Z", updatedAt: "2026-05-31T10:00:00Z", closedAt: null,
  },
];

// ─── Disputes ──────────────────────────────────────────────────────────────────

export const SEED_DISPUTES: Dispute[] = [
  {
    id: "dsp-001", disputeNumber: "DSP-A1B2C3D4", type: "item_not_as_described", status: "under_review", buyerId: "cust-001", sellerId: "seller-002", orderId: "ord-103", amount: 1299, currency: "INR", description: "Product color does not match listing photos", buyerEvidence: [{ id: "ev-001", submittedBy: "cust-001", submittedByRole: "buyer", type: "image", content: "photo_received_item.jpg", description: "Photo of received item showing red instead of blue", submittedAt: "2026-05-29T14:00:00Z" }], sellerEvidence: [{ id: "ev-002", submittedBy: "seller-002", submittedByRole: "seller", type: "text", content: "Listing clearly states color may vary by batch.", description: "Seller response about color variation policy", submittedAt: "2026-05-30T09:00:00Z" }], timeline: [{ id: "evt-001", action: "dispute_filed", actor: "cust-001", actorRole: "customer", detail: "Dispute filed", timestamp: "2026-05-29T13:00:00Z" }], assignedTo: "mediator-001", resolution: null, slaDeadline: "2026-06-05T13:00:00Z", createdAt: "2026-05-29T13:00:00Z", updatedAt: "2026-05-30T09:00:00Z", resolvedAt: null,
  },
  {
    id: "dsp-002", disputeNumber: "DSP-E5F6G7H8", type: "order_not_received", status: "evidence_collection", buyerId: "cust-002", sellerId: "seller-001", orderId: "ord-101", amount: 3499, currency: "INR", description: "Order shows delivered but I never received it", buyerEvidence: [], sellerEvidence: [], timeline: [{ id: "evt-002", action: "dispute_filed", actor: "cust-002", actorRole: "customer", detail: "Dispute filed", timestamp: "2026-05-30T15:00:00Z" }], assignedTo: null, resolution: null, slaDeadline: "2026-06-06T15:00:00Z", createdAt: "2026-05-30T15:00:00Z", updatedAt: "2026-05-30T15:00:00Z", resolvedAt: null,
  },
  {
    id: "dsp-003", disputeNumber: "DSP-I9J0K1L2", type: "damaged_item", status: "resolved_buyer", buyerId: "cust-006", sellerId: "seller-003", orderId: "ord-106", amount: 899, currency: "INR", description: "Item arrived with visible damage to packaging and product", buyerEvidence: [{ id: "ev-003", submittedBy: "cust-006", submittedByRole: "buyer", type: "image", content: "damaged_package.jpg", description: "Photo showing damaged packaging", submittedAt: "2026-05-28T11:00:00Z" }], sellerEvidence: [], timeline: [], assignedTo: "mediator-001", resolution: { outcome: "buyer_wins", summary: "Clear evidence of shipping damage. Full refund issued.", refundAmount: 899, resolvedBy: "mediator-001", resolvedAt: "2026-05-29T10:00:00Z" }, slaDeadline: "2026-06-04T10:00:00Z", createdAt: "2026-05-28T10:00:00Z", updatedAt: "2026-05-29T10:00:00Z", resolvedAt: "2026-05-29T10:00:00Z",
  },
];

// ─── Incidents ─────────────────────────────────────────────────────────────────

export const SEED_INCIDENTS: MarketplaceIncident[] = [
  {
    id: "inc-001", incidentNumber: "INC-A1B2C3", type: "delivery_disruption", severity: "high", status: "investigating", title: "Carrier XYZ delayed all shipments by 2+ days", description: "Major carrier reported logistics hub closure affecting 200+ orders", impactScope: "North India region", impactedCustomers: 187, impactedSellers: 45, impactedOrders: 212, detectedAt: "2026-05-30T14:00:00Z", acknowledgedAt: "2026-05-30T14:30:00Z", resolvedAt: null, ownerId: "ops-lead-001", ownerName: "Operations Lead", responders: ["ops-lead-001", "logistics-mgr-001"], timeline: [{ id: "ie-001", action: "incident_detected", actor: "system", detail: "Automatic detection: carrier delay spike", timestamp: "2026-05-30T14:00:00Z" }, { id: "ie-002", action: "acknowledged", actor: "ops-lead-001", detail: "Acknowledged and investigating", timestamp: "2026-05-30T14:30:00Z" }], postmortem: null, createdAt: "2026-05-30T14:00:00Z", updatedAt: "2026-05-30T14:30:00Z",
  },
  {
    id: "inc-002", incidentNumber: "INC-D4E5F6", type: "seller_fraud", severity: "critical", status: "resolved", title: "Seller selling counterfeit electronics", description: "Multiple customer reports of fake branded electronics from seller-004", impactScope: "All customers who purchased from seller-004", impactedCustomers: 23, impactedSellers: 1, impactedOrders: 31, detectedAt: "2026-05-28T09:00:00Z", acknowledgedAt: "2026-05-28T09:15:00Z", resolvedAt: "2026-05-28T18:00:00Z", ownerId: "trust-safety-001", ownerName: "Trust & Safety Lead", responders: ["trust-safety-001", "legal-001"], timeline: [], postmortem: { summary: "Seller-004 was selling counterfeit electronics through altered listings", rootCause: "Inadequate seller verification for electronics category", impact: "23 customers received counterfeit goods worth ₹4.5L total", timeline: "Detected 9am, seller suspended 9:30am, all orders flagged 10am, customers notified 2pm, full resolution 6pm", lessonsLearned: ["Strengthen electronics category verification", "Add brand authentication checks", "Implement periodic seller product audits"], actionItems: [{ task: "Add brand verification for electronics", owner: "catalog-team", deadline: "2026-06-15", status: "pending" }], publishedAt: "2026-05-29T10:00:00Z" }, createdAt: "2026-05-28T09:00:00Z", updatedAt: "2026-05-29T10:00:00Z",
  },
];

// ─── Fulfillment Orders ────────────────────────────────────────────────────────

export const SEED_FULFILLMENT_ORDERS: FulfillmentOrder[] = [
  { id: "ful-001", orderId: "ord-101", sellerId: "seller-001", status: "shipped", deliveryRisk: "minor_delay", promisedDate: "2026-05-30T23:59:00Z", estimatedDate: "2026-06-01T23:59:00Z", actualDate: null, delayDays: 1, carrier: "Delhivery", trackingNumber: "DL123456", slaBreached: false, exceptions: [], createdAt: "2026-05-27T10:00:00Z", updatedAt: "2026-05-29T14:00:00Z" },
  { id: "ful-002", orderId: "ord-102", sellerId: "seller-002", status: "delivered", deliveryRisk: "on_track", promisedDate: "2026-05-29T23:59:00Z", estimatedDate: "2026-05-29T23:59:00Z", actualDate: "2026-05-29T14:00:00Z", delayDays: 0, carrier: "BlueDart", trackingNumber: "BD789012", slaBreached: false, exceptions: [], createdAt: "2026-05-26T10:00:00Z", updatedAt: "2026-05-29T14:00:00Z" },
  { id: "ful-003", orderId: "ord-103", sellerId: "seller-002", status: "delivered", deliveryRisk: "on_track", promisedDate: "2026-05-28T23:59:00Z", estimatedDate: "2026-05-28T23:59:00Z", actualDate: "2026-05-28T10:00:00Z", delayDays: 0, carrier: "Delhivery", trackingNumber: "DL345678", slaBreached: false, exceptions: [], createdAt: "2026-05-25T10:00:00Z", updatedAt: "2026-05-28T10:00:00Z" },
  { id: "ful-004", orderId: "ord-104", sellerId: "seller-003", status: "pending", deliveryRisk: "major_delay", promisedDate: "2026-05-29T23:59:00Z", estimatedDate: "2026-06-02T23:59:00Z", actualDate: null, delayDays: 3, carrier: null, trackingNumber: null, slaBreached: true, exceptions: [{ id: "exc-001", type: "delay", description: "Seller has not shipped order for 3 days", detectedAt: "2026-05-30T10:00:00Z", resolvedAt: null }], createdAt: "2026-05-26T10:00:00Z", updatedAt: "2026-05-30T10:00:00Z" },
  { id: "ful-005", orderId: "ord-105", sellerId: "seller-001", status: "in_transit", deliveryRisk: "on_track", promisedDate: "2026-06-01T23:59:00Z", estimatedDate: "2026-05-31T23:59:00Z", actualDate: null, delayDays: 0, carrier: "DTDC", trackingNumber: "DT901234", slaBreached: false, exceptions: [], createdAt: "2026-05-28T10:00:00Z", updatedAt: "2026-05-30T16:00:00Z" },
];

// ─── Refund Requests ───────────────────────────────────────────────────────────

export const SEED_REFUND_REQUESTS: RefundRequest[] = [
  { id: "ref-001", orderId: "ord-103", customerId: "cust-003", sellerId: "seller-002", amount: 1299, currency: "INR", reason: "Wrong color received", category: "wrong_item", status: "approved", riskLevel: "low", riskScore: 15, riskFactors: [], autoApproved: true, approvedBy: "system", approvedAt: "2026-05-29T16:30:00Z", rejectionReason: null, audit: [{ id: "ra-001", timestamp: "2026-05-29T16:00:00Z", actor: "cust-003", actorRole: "customer", action: "refund_requested", detail: "Refund requested" }], createdAt: "2026-05-29T16:00:00Z", completedAt: "2026-05-29T16:30:00Z" },
  { id: "ref-002", orderId: "ord-106", customerId: "cust-006", sellerId: "seller-003", amount: 899, currency: "INR", reason: "Product arrived damaged", category: "defective", status: "completed", riskLevel: "low", riskScore: 12, riskFactors: [], autoApproved: true, approvedBy: "system", approvedAt: "2026-05-29T11:00:00Z", rejectionReason: null, audit: [], createdAt: "2026-05-29T10:30:00Z", completedAt: "2026-05-29T11:00:00Z" },
  { id: "ref-003", orderId: "ord-107", customerId: "cust-007", sellerId: "seller-001", amount: 4999, currency: "INR", reason: "Changed my mind about the purchase", category: "changed_mind", status: "under_review", riskLevel: "medium", riskScore: 42, riskFactors: ["Above-average refund amount", "Discretionary refund"], autoApproved: false, approvedBy: null, approvedAt: null, rejectionReason: null, audit: [], createdAt: "2026-05-31T08:00:00Z", completedAt: null },
  { id: "ref-004", orderId: "ord-108", customerId: "cust-008", sellerId: "seller-002", amount: 7500, currency: "INR", reason: "Order was duplicate", category: "duplicate", status: "under_review", riskLevel: "high", riskScore: 68, riskFactors: ["High value refund", "Duplicate refund claim", "Multiple recent refunds"], autoApproved: false, approvedBy: null, approvedAt: null, rejectionReason: null, audit: [], createdAt: "2026-05-31T09:00:00Z", completedAt: null },
];

// ─── Cancellation Requests ─────────────────────────────────────────────────────

export const SEED_CANCELLATIONS: CancellationRequest[] = [
  { id: "can-001", orderId: "ord-109", requestedBy: "cust-009", requestedByRole: "customer", reason: "Found better price elsewhere", category: "customer_request", status: "approved", inventoryRestored: true, refundTriggered: true, relatedRefundId: "ref-005", approvedBy: "system", audit: [], createdAt: "2026-05-30T11:00:00Z", completedAt: "2026-05-30T11:05:00Z" },
  { id: "can-002", orderId: "ord-110", requestedBy: "seller-003", requestedByRole: "seller", reason: "Item out of stock - supplier issue", category: "out_of_stock", status: "approved", inventoryRestored: false, refundTriggered: true, relatedRefundId: "ref-006", approvedBy: "system", audit: [], createdAt: "2026-05-30T14:00:00Z", completedAt: "2026-05-30T14:10:00Z" },
];

// ─── Customer Profiles ─────────────────────────────────────────────────────────

export const SEED_CUSTOMERS: CustomerProfile[] = [
  { customerId: "cust-001", name: "Priya Sharma", email: "priya@example.com", healthStatus: "at_risk", healthScore: 55, lifetimeOrders: 12, lifetimeSpend: 34500, openIssues: 2, totalIssues: 4, lastOrderAt: "2026-05-27T10:00:00Z", lastIssueAt: "2026-05-30T09:00:00Z", satisfactionAvg: 3.2, riskFactors: ["Multiple open issues", "Low satisfaction"] },
  { customerId: "cust-002", name: "Rahul Verma", email: "rahul@example.com", healthStatus: "at_risk", healthScore: 48, lifetimeOrders: 8, lifetimeSpend: 22000, openIssues: 1, totalIssues: 3, lastOrderAt: "2026-05-25T10:00:00Z", lastIssueAt: "2026-05-30T09:00:00Z", satisfactionAvg: 2.8, riskFactors: ["Has open issues", "Low satisfaction"] },
  { customerId: "cust-003", name: "Anita Patel", email: "anita@example.com", healthStatus: "healthy", healthScore: 82, lifetimeOrders: 25, lifetimeSpend: 67000, openIssues: 0, totalIssues: 2, lastOrderAt: "2026-05-28T10:00:00Z", lastIssueAt: "2026-05-29T10:00:00Z", satisfactionAvg: 4.5, riskFactors: [] },
  { customerId: "cust-004", name: "Vikram Singh", email: "vikram@example.com", healthStatus: "healthy", healthScore: 75, lifetimeOrders: 6, lifetimeSpend: 15000, openIssues: 1, totalIssues: 1, lastOrderAt: "2026-05-30T10:00:00Z", lastIssueAt: "2026-05-31T10:00:00Z", satisfactionAvg: 4.0, riskFactors: ["Has open issues"] },
  { customerId: "cust-005", name: "Meera Joshi", email: "meera@example.com", healthStatus: "churning", healthScore: 35, lifetimeOrders: 3, lifetimeSpend: 8500, openIssues: 1, totalIssues: 2, lastOrderAt: "2026-03-15T10:00:00Z", lastIssueAt: "2026-05-31T10:00:00Z", satisfactionAvg: 2.5, riskFactors: ["Inactive 60+ days", "Low satisfaction", "Has open issues"] },
];

// ─── Customer Issues ───────────────────────────────────────────────────────────

export const SEED_CUSTOMER_ISSUES: CustomerIssue[] = [
  { id: "ci-001", customerId: "cust-001", type: "delivery_complaint", description: "Order not delivered after 7 days", priority: "high", status: "investigating", relatedTicketId: "tkt-001", relatedOrderId: "ord-101", resolution: null, createdAt: "2026-05-30T09:00:00Z", resolvedAt: null },
  { id: "ci-002", customerId: "cust-002", type: "complaint", description: "Payment deducted but order failed", priority: "urgent", status: "open", relatedTicketId: "tkt-002", relatedOrderId: "ord-102", resolution: null, createdAt: "2026-05-30T09:00:00Z", resolvedAt: null },
  { id: "ci-003", customerId: "cust-005", type: "refund_request", description: "Refund not processed after approval", priority: "high", status: "open", relatedTicketId: "tkt-005", relatedOrderId: "ord-105", resolution: null, createdAt: "2026-05-31T10:00:00Z", resolvedAt: null },
];

// ─── Seller Profiles ───────────────────────────────────────────────────────────

export const SEED_SELLERS: SellerOperationsProfile[] = [
  { sellerId: "seller-001", storeName: "TechMart India", healthStatus: "good", healthScore: 78, totalOrders: 450, fulfillmentRate: 0.96, lateShipmentRate: 0.04, returnRate: 0.06, disputeRate: 0.02, customerRating: 4.3, activeViolations: 0, totalViolations: 1, warningCount: 1, lastViolationAt: "2026-04-15T10:00:00Z", riskFactors: [] },
  { sellerId: "seller-002", storeName: "Fashion Hub", healthStatus: "watch", healthScore: 58, totalOrders: 280, fulfillmentRate: 0.91, lateShipmentRate: 0.12, returnRate: 0.14, disputeRate: 0.04, customerRating: 3.8, activeViolations: 1, totalViolations: 3, warningCount: 2, lastViolationAt: "2026-05-29T10:00:00Z", riskFactors: ["Elevated late shipments", "Above-average returns", "Active violation"] },
  { sellerId: "seller-003", storeName: "Home Essentials", healthStatus: "probation", healthScore: 38, totalOrders: 120, fulfillmentRate: 0.82, lateShipmentRate: 0.22, returnRate: 0.18, disputeRate: 0.06, customerRating: 3.2, activeViolations: 2, totalViolations: 5, warningCount: 4, lastViolationAt: "2026-05-30T10:00:00Z", riskFactors: ["Low fulfillment rate", "High late shipment rate", "High return rate", "High dispute rate", "Multiple active violations", "Multiple warnings"] },
];

// ─── Seller Violations ─────────────────────────────────────────────────────────

export const SEED_VIOLATIONS: SellerViolation[] = [
  { id: "vio-001", sellerId: "seller-002", type: "late_shipment", severity: "minor", description: "Consistently late shipments in last 30 days (12% rate)", evidence: ["shipment_report_may2026.csv"], status: "confirmed", action: { type: "warning", reason: "Late shipment rate exceeds 10% threshold", appliedAt: "2026-05-29T12:00:00Z", expiresAt: null, appliedBy: "ops-admin-001" }, reportedBy: "system", createdAt: "2026-05-29T10:00:00Z", resolvedAt: "2026-05-29T12:00:00Z" },
  { id: "vio-002", sellerId: "seller-003", type: "quality_issue", severity: "major", description: "Multiple customer complaints about product quality not matching descriptions", evidence: ["complaint_001.png", "complaint_002.png", "review_screenshot.png"], status: "investigating", action: null, reportedBy: "trust-safety-001", createdAt: "2026-05-30T10:00:00Z", resolvedAt: null },
  { id: "vio-003", sellerId: "seller-003", type: "late_shipment", severity: "major", description: "22% late shipment rate, multiple SLA breaches", evidence: ["fulfillment_report.csv"], status: "confirmed", action: { type: "listing_removal", reason: "Persistent SLA violations - 3 listings removed", appliedAt: "2026-05-30T15:00:00Z", expiresAt: "2026-06-15T15:00:00Z", appliedBy: "ops-admin-001" }, reportedBy: "system", createdAt: "2026-05-30T09:00:00Z", resolvedAt: "2026-05-30T15:00:00Z" },
];
