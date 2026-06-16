/**
 * MCP-1E — Marketplace Operations Domain Model
 * Types for: Support, Customer Ops, Seller Ops, Disputes, Incidents,
 * Fulfillment Ops, Refund/Cancellation Governance, Operations Center, Intelligence
 */

// ─── Common ────────────────────────────────────────────────────────────────────

export type OperationsRole = "customer" | "seller" | "agent" | "supervisor" | "admin";
export type Priority = "low" | "medium" | "high" | "urgent" | "critical";
export type HealthScore = number; // 0-100

export type AuditEntry = {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: OperationsRole;
  action: string;
  detail: string;
  metadata?: Record<string, unknown>;
};

// ─── Phase 2: Support Platform ─────────────────────────────────────────────────

export type TicketStatus = "open" | "assigned" | "in_progress" | "waiting_customer" | "waiting_internal" | "escalated" | "resolved" | "closed";
export type TicketCategory = "order_issue" | "payment_issue" | "delivery_issue" | "product_issue" | "account_issue" | "seller_complaint" | "refund_request" | "cancellation" | "general_inquiry" | "technical_issue";
export type TicketChannel = "web" | "email" | "phone" | "chat" | "in_app";

export type SLAPolicy = {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  escalationMinutes: number;
};

export type SupportTicket = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: Priority;
  status: TicketStatus;
  channel: TicketChannel;
  createdBy: string;
  createdByRole: "customer" | "seller";
  assignedTo: string | null;
  assignedTeam: string | null;
  relatedOrderId: string | null;
  relatedProductId: string | null;
  relatedSellerId: string | null;
  tags: string[];
  messages: TicketMessage[];
  sla: TicketSLA;
  escalationLevel: number;
  resolution: TicketResolution | null;
  audit: AuditEntry[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: OperationsRole;
  content: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: string;
};

export type TicketSLA = {
  policy: SLAPolicy;
  firstResponseDue: string;
  resolutionDue: string;
  firstResponseAt: string | null;
  isBreached: boolean;
  breachType: "first_response" | "resolution" | null;
};

export type TicketResolution = {
  type: "resolved" | "closed_duplicate" | "closed_no_response" | "closed_invalid";
  summary: string;
  resolvedBy: string;
  resolvedAt: string;
  satisfactionScore: number | null;
};

export type SupportAnalytics = {
  totalTickets: number;
  openTickets: number;
  avgResolutionMinutes: number;
  slaComplianceRate: number;
  firstResponseComplianceRate: number;
  ticketsByCategory: Record<TicketCategory, number>;
  ticketsByPriority: Record<Priority, number>;
  ticketsByStatus: Record<TicketStatus, number>;
  escalationRate: number;
  satisfactionAverage: number;
  agentPerformance: AgentPerformance[];
};

export type AgentPerformance = {
  agentId: string;
  agentName: string;
  ticketsHandled: number;
  avgResolutionMinutes: number;
  satisfactionScore: number;
  slaCompliance: number;
};

// ─── Phase 3: Customer Operations Center ───────────────────────────────────────

export type CustomerIssueType = "complaint" | "refund_request" | "cancellation_request" | "delivery_complaint" | "service_complaint" | "escalation";

export type CustomerHealthStatus = "healthy" | "at_risk" | "churning" | "lost";

export type CustomerProfile = {
  customerId: string;
  name: string;
  email: string;
  healthStatus: CustomerHealthStatus;
  healthScore: HealthScore;
  lifetimeOrders: number;
  lifetimeSpend: number;
  openIssues: number;
  totalIssues: number;
  lastOrderAt: string | null;
  lastIssueAt: string | null;
  satisfactionAvg: number;
  riskFactors: string[];
};

export type CustomerIssue = {
  id: string;
  customerId: string;
  type: CustomerIssueType;
  description: string;
  priority: Priority;
  status: "open" | "investigating" | "action_taken" | "resolved" | "closed";
  relatedTicketId: string | null;
  relatedOrderId: string | null;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type CustomerOperationsSnapshot = {
  totalCustomers: number;
  healthyCustomers: number;
  atRiskCustomers: number;
  churningCustomers: number;
  openComplaints: number;
  pendingRefunds: number;
  pendingCancellations: number;
  avgSatisfaction: number;
  issuesByType: Record<CustomerIssueType, number>;
  topRiskFactors: Array<{ factor: string; count: number }>;
};

// ─── Phase 4: Seller Operations Center ─────────────────────────────────────────

export type ViolationType = "late_shipment" | "fake_product" | "price_gouging" | "policy_violation" | "quality_issue" | "customer_harassment" | "fraud" | "ip_violation";
export type ViolationSeverity = "warning" | "minor" | "major" | "critical";
export type SellerHealthStatus = "excellent" | "good" | "watch" | "probation" | "suspended";

export type SellerViolation = {
  id: string;
  sellerId: string;
  type: ViolationType;
  severity: ViolationSeverity;
  description: string;
  evidence: string[];
  status: "reported" | "investigating" | "confirmed" | "dismissed" | "actioned";
  action: SellerAction | null;
  reportedBy: string;
  createdAt: string;
  resolvedAt: string | null;
};

export type SellerAction = {
  type: "warning" | "fine" | "listing_removal" | "temporary_suspension" | "permanent_ban";
  reason: string;
  appliedAt: string;
  expiresAt: string | null;
  appliedBy: string;
};

export type SellerOperationsProfile = {
  sellerId: string;
  storeName: string;
  healthStatus: SellerHealthStatus;
  healthScore: HealthScore;
  totalOrders: number;
  fulfillmentRate: number;
  lateShipmentRate: number;
  returnRate: number;
  disputeRate: number;
  customerRating: number;
  activeViolations: number;
  totalViolations: number;
  warningCount: number;
  lastViolationAt: string | null;
  riskFactors: string[];
};

export type SellerOperationsSnapshot = {
  totalSellers: number;
  excellentSellers: number;
  watchSellers: number;
  probationSellers: number;
  suspendedSellers: number;
  openViolations: number;
  pendingInvestigations: number;
  avgFulfillmentRate: number;
  avgCustomerRating: number;
  topViolationTypes: Array<{ type: ViolationType; count: number }>;
  riskDistribution: Record<SellerHealthStatus, number>;
};

// ─── Phase 5: Dispute Resolution Platform ──────────────────────────────────────

export type DisputeType = "order_not_received" | "item_not_as_described" | "damaged_item" | "wrong_item" | "refund_disagreement" | "payment_dispute" | "seller_misconduct" | "delivery_dispute";
export type DisputeStatus = "filed" | "evidence_collection" | "under_review" | "mediation" | "escalated" | "resolved_buyer" | "resolved_seller" | "resolved_platform" | "dismissed" | "closed";

export type Dispute = {
  id: string;
  disputeNumber: string;
  type: DisputeType;
  status: DisputeStatus;
  buyerId: string;
  sellerId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  buyerEvidence: DisputeEvidence[];
  sellerEvidence: DisputeEvidence[];
  timeline: DisputeEvent[];
  assignedTo: string | null;
  resolution: DisputeResolution | null;
  slaDeadline: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type DisputeEvidence = {
  id: string;
  submittedBy: string;
  submittedByRole: "buyer" | "seller";
  type: "text" | "image" | "document" | "tracking" | "communication";
  content: string;
  description: string;
  submittedAt: string;
};

export type DisputeEvent = {
  id: string;
  action: string;
  actor: string;
  actorRole: OperationsRole;
  detail: string;
  timestamp: string;
};

export type DisputeResolution = {
  outcome: "buyer_wins" | "seller_wins" | "split" | "platform_decision" | "mutual_agreement";
  summary: string;
  refundAmount: number | null;
  resolvedBy: string;
  resolvedAt: string;
};

export type DisputeAnalytics = {
  totalDisputes: number;
  openDisputes: number;
  avgResolutionDays: number;
  buyerWinRate: number;
  sellerWinRate: number;
  splitRate: number;
  disputesByType: Record<DisputeType, number>;
  escalationRate: number;
  totalDisputeAmount: number;
  avgDisputeAmount: number;
};

// ─── Phase 6: Incident Management System ───────────────────────────────────────

export type IncidentType = "seller_fraud" | "mass_defect" | "payment_failure" | "delivery_disruption" | "platform_outage" | "data_breach" | "policy_violation_mass" | "customer_safety";
export type IncidentSeverity = "low" | "medium" | "high" | "critical" | "catastrophic";
export type IncidentStatus = "detected" | "acknowledged" | "investigating" | "mitigating" | "resolved" | "post_mortem" | "closed";

export type MarketplaceIncident = {
  id: string;
  incidentNumber: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  impactScope: string;
  impactedCustomers: number;
  impactedSellers: number;
  impactedOrders: number;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  ownerId: string;
  ownerName: string;
  responders: string[];
  timeline: IncidentEvent[];
  postmortem: Postmortem | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentEvent = {
  id: string;
  action: string;
  actor: string;
  detail: string;
  timestamp: string;
};

export type Postmortem = {
  summary: string;
  rootCause: string;
  impact: string;
  timeline: string;
  lessonsLearned: string[];
  actionItems: Array<{ task: string; owner: string; deadline: string; status: "pending" | "done" }>;
  publishedAt: string;
};

export type IncidentAnalytics = {
  totalIncidents: number;
  openIncidents: number;
  avgResolutionHours: number;
  incidentsByType: Record<IncidentType, number>;
  incidentsBySeverity: Record<IncidentSeverity, number>;
  mttr: number; // mean time to resolve in hours
  mtta: number; // mean time to acknowledge in minutes
  postmortemCompletionRate: number;
};

// ─── Phase 7: Fulfillment Operations Platform ──────────────────────────────────

export type FulfillmentStatus = "pending" | "confirmed" | "processing" | "packed" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned";
export type DeliveryRisk = "on_track" | "minor_delay" | "major_delay" | "at_risk" | "failed";

export type FulfillmentOrder = {
  id: string;
  orderId: string;
  sellerId: string;
  status: FulfillmentStatus;
  deliveryRisk: DeliveryRisk;
  promisedDate: string;
  estimatedDate: string;
  actualDate: string | null;
  delayDays: number;
  carrier: string | null;
  trackingNumber: string | null;
  slaBreached: boolean;
  exceptions: FulfillmentException[];
  createdAt: string;
  updatedAt: string;
};

export type FulfillmentException = {
  id: string;
  type: "delay" | "damage" | "lost" | "wrong_address" | "refused" | "carrier_issue";
  description: string;
  detectedAt: string;
  resolvedAt: string | null;
};

export type FulfillmentSnapshot = {
  totalOrders: number;
  pendingFulfillment: number;
  inTransit: number;
  delivered: number;
  failed: number;
  onTimeRate: number;
  avgDeliveryDays: number;
  slaBreachCount: number;
  exceptionCount: number;
  riskDistribution: Record<DeliveryRisk, number>;
  carrierPerformance: Array<{ carrier: string; onTimeRate: number; volume: number }>;
};

// ─── Phase 8: Refund & Cancellation Governance ─────────────────────────────────

export type RefundStatus = "requested" | "under_review" | "approved" | "rejected" | "processing" | "completed" | "failed";
export type CancellationStatus = "requested" | "approved" | "rejected" | "processing" | "completed";
export type RefundRiskLevel = "low" | "medium" | "high" | "fraud_suspected";

export type RefundRequest = {
  id: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  reason: string;
  category: "defective" | "not_received" | "wrong_item" | "changed_mind" | "duplicate" | "fraud";
  status: RefundStatus;
  riskLevel: RefundRiskLevel;
  riskScore: number; // 0-100
  riskFactors: string[];
  autoApproved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  audit: AuditEntry[];
  createdAt: string;
  completedAt: string | null;
};

export type CancellationRequest = {
  id: string;
  orderId: string;
  requestedBy: string;
  requestedByRole: "customer" | "seller" | "admin";
  reason: string;
  category: "customer_request" | "seller_unable" | "fraud_detected" | "out_of_stock" | "pricing_error" | "policy_violation";
  status: CancellationStatus;
  inventoryRestored: boolean;
  refundTriggered: boolean;
  relatedRefundId: string | null;
  approvedBy: string | null;
  audit: AuditEntry[];
  createdAt: string;
  completedAt: string | null;
};

export type RefundGovernanceRules = {
  autoApproveThreshold: number; // amount below which auto-approve
  autoApproveMaxPerDay: number;
  highRiskThreshold: number; // risk score above which requires manual review
  fraudBlockThreshold: number; // risk score above which auto-block
  maxRefundPerCustomerPerMonth: number;
  cooldownDays: number; // days between refund requests from same customer
};

export type RefundAnalytics = {
  totalRefunds: number;
  approvedRefunds: number;
  rejectedRefunds: number;
  totalAmount: number;
  avgAmount: number;
  autoApprovalRate: number;
  fraudDetectedCount: number;
  avgProcessingHours: number;
  refundsByCategory: Record<string, number>;
  riskDistribution: Record<RefundRiskLevel, number>;
};

// ─── Phase 9: Marketplace Operations Center ────────────────────────────────────

export type MarketplaceHealthDomain = "support" | "disputes" | "incidents" | "fulfillment" | "sellers" | "customers" | "refunds";

export type MarketplaceKPI = {
  id: string;
  name: string;
  domain: MarketplaceHealthDomain;
  value: number;
  target: number;
  unit: string;
  trend: "improving" | "stable" | "degrading";
  status: "good" | "warning" | "critical";
};

export type OperationalAlert = {
  id: string;
  domain: MarketplaceHealthDomain;
  severity: Priority;
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue: number;
  suggestedAction: string;
  createdAt: string;
  acknowledgedAt: string | null;
};

export type MarketplaceOperationsSnapshot = {
  overallHealth: HealthScore;
  healthByDomain: Record<MarketplaceHealthDomain, HealthScore>;
  kpis: MarketplaceKPI[];
  activeAlerts: OperationalAlert[];
  supportSnapshot: SupportAnalytics;
  customerSnapshot: CustomerOperationsSnapshot;
  sellerSnapshot: SellerOperationsSnapshot;
  disputeSnapshot: DisputeAnalytics;
  incidentSnapshot: IncidentAnalytics;
  fulfillmentSnapshot: FulfillmentSnapshot;
  refundSnapshot: RefundAnalytics;
};

// ─── Phase 10: Admin Operational Governance ─────────────────────────────────────

export type GovernanceAction = {
  id: string;
  domain: MarketplaceHealthDomain;
  type: "policy_change" | "threshold_update" | "seller_action" | "incident_response" | "sla_override" | "manual_approval";
  description: string;
  appliedBy: string;
  appliedAt: string;
  impact: string;
};

// ─── Phase 11: Operational Intelligence ────────────────────────────────────────

export type OperationalRiskType = "support_spike" | "dispute_surge" | "fulfillment_degradation" | "seller_risk_cluster" | "customer_churn_wave" | "refund_fraud_pattern" | "incident_precursor";

export type OperationalRisk = {
  id: string;
  type: OperationalRiskType;
  severity: Priority;
  title: string;
  description: string;
  affectedDomain: MarketplaceHealthDomain;
  confidence: number; // 0-1
  detectedAt: string;
  recommendation: OperationalRecommendation;
};

export type OperationalRecommendation = {
  id: string;
  title: string;
  description: string;
  domain: MarketplaceHealthDomain;
  priority: Priority;
  expectedImpact: string;
  effort: "low" | "medium" | "high";
  status: "proposed" | "accepted" | "in_progress" | "completed" | "dismissed";
};

export type OperationalForecast = {
  domain: MarketplaceHealthDomain;
  metric: string;
  currentValue: number;
  forecastValue: number;
  forecastPeriod: string;
  confidence: number;
  trend: "improving" | "stable" | "degrading";
  riskIfUnaddressed: string;
};

export type OperationalIntelligenceSnapshot = {
  risks: OperationalRisk[];
  recommendations: OperationalRecommendation[];
  forecasts: OperationalForecast[];
  healthTrend: Array<{ date: string; score: HealthScore }>;
  topConcerns: string[];
};
