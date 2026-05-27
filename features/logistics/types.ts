import type { Order } from "@/types";

export type DeliveryMode = "seller_self" | "shiprocket" | "porter" | "dunzo";

export type DeliveryStatus =
  | "DELIVERY_PENDING"
  | "READY_FOR_DISPATCH"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVING"
  | "DELIVERED"
  | "FAILED"
  | "RETURN_INITIATED"
  | "RETURNED"
  | "CANCELLED";

export type LegacyDeliveryStatus =
  | "PENDING_DISPATCH"
  | "ASSIGNED"
  | "PICKUP_PENDING"
  | "PICKED_UP"
  | "NEARBY";

export type DeliveryEventType =
  | "dispatch_created"
  | "self_delivery_assigned"
  | "pickup_ready"
  | "dispatch_confirmed"
  | "in_transit"
  | "arriving"
  | "delivered"
  | "failed"
  | "return_started"
  | "returned"
  | "eta_updated"
  | "delivery_cancelled"
  | "recovery_scheduled"
  | "verification_recorded";

export interface DeliveryPartner {
  id: string;
  name: string;
  mode: DeliveryMode;
  serviceLevel: "hyperlocal" | "same_day" | "standard";
  phone?: string;
  rating?: number;
  integrationStatus: "active" | "placeholder" | "manual";
}

export interface DeliveryTrackingEvent {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  type: DeliveryEventType;
  title: string;
  description: string;
  occurredAt: string;
  actor: "seller" | "partner" | "system" | "buyer" | "admin";
  locationLabel?: string;
  latitude?: number;
  longitude?: number;
  etaMinutes?: number;
}

export interface DeliveryEtaLog {
  id: string;
  deliveryId: string;
  estimatedMinutes: number;
  confidence: "high" | "medium" | "low";
  reason: string;
  createdAt: string;
}

export interface ShipmentMetadata {
  provider: DeliveryMode;
  externalShipmentId?: string;
  externalTrackingUrl?: string;
  shiprocketAwb?: string;
  porterBookingId?: string;
  dunzoTaskId?: string;
  syncStatus: "not_required" | "pending" | "synced" | "failed";
  syncMessage?: string;
}

export interface Delivery {
  id: string;
  orderId: string;
  orderCode: string;
  buyerName: string;
  buyerPhone: string;
  vendorId: string;
  vendorName: string;
  deliveryAddress: string;
  mode: DeliveryMode;
  status: DeliveryStatus;
  partner: DeliveryPartner;
  assignedTo?: string;
  assignedPhone?: string;
  distanceKm: number;
  prepMinutes: number;
  etaMinutes: number;
  etaWindow: string;
  etaConfidence: "high" | "medium" | "low";
  promisedAt: string;
  createdAt: string;
  updatedAt: string;
  shipment: ShipmentMetadata;
  events: DeliveryTrackingEvent[];
  etaLogs: DeliveryEtaLog[];
  verification?: DeliveryVerification;
  recovery?: DeliveryRecoveryState;
}

export interface DeliveryTransitionInput {
  deliveryId: string;
  toStatus: DeliveryStatus;
  actor: "seller" | "partner" | "system" | "buyer" | "admin";
  note: string;
  etaMinutes?: number;
  failureReason?: string;
  locationLabel?: string;
  proofPlaceholder?: string;
}

export interface DeliveryVerification {
  state: "pending" | "seller_confirmed" | "buyer_placeholder" | "proof_recorded" | "disputed";
  sellerConfirmedAt?: string;
  buyerConfirmedAt?: string;
  proofPlaceholder?: string;
  recordedBy?: "seller" | "buyer" | "partner" | "admin" | "system";
}

export interface DeliveryRecoveryState {
  reason: "failed_delivery" | "unreachable_customer" | "dispatch_cancelled" | "timeout" | "stale_tracking" | "seller_abandonment" | "delay";
  action: "retry_dispatch" | "customer_contact" | "return_to_seller" | "cancel_and_refund_review" | "manual_review" | "eta_refresh";
  runAfter: string;
  attempts: number;
  status: "pending" | "running" | "resolved" | "failed";
}

export interface DeliveryOperationalSignals {
  fulfillmentLatencyMinutes: number;
  dispatchDelayMinutes: number;
  etaDriftMinutes: number;
  staleForMinutes: number;
  failureCount: number;
  alertLevel: "healthy" | "watch" | "critical";
}

export interface DispatchQueue {
  pending: Delivery[];
  active: Delivery[];
  delayed: Delivery[];
  failed: Delivery[];
}

export interface ShiprocketCreateShipmentInput {
  order: Order;
  pickupPostcode: string;
  deliveryPostcode: string;
  weightGrams: number;
}

export interface ShiprocketShipmentDraft {
  provider: "shiprocket";
  payload: Record<string, string | number | boolean | Array<Record<string, string | number>>>;
  mappingNotes: string[];
}

export type LogisticsProviderState = "HEALTHY" | "DEGRADED" | "OUTAGE" | "COOLDOWN";

export interface LogisticsProviderHealth {
  provider: DeliveryMode;
  state: LogisticsProviderState;
  priority: number;
  averageLatencyMs: number;
  failureCount: number;
  cooldownUntil?: string | null;
  lastFailureAt?: string | null;
}

export interface LogisticsProviderPlan {
  primary: DeliveryMode;
  failover?: DeliveryMode;
  providerIndependent: true;
  reason: string;
  degraded: boolean;
  score: number;
  throttledProviders: DeliveryMode[];
}

export interface LogisticsProviderAttempt {
  provider: DeliveryMode;
  ok: boolean;
  latencyMs: number;
  attemptedAt: string;
  errorCode?: string;
}

export interface LogisticsBackpressureSignal {
  queueDepth: number;
  providerFailureCount: number;
  retryCount: number;
  activeDispatches: number;
  maxConcurrentDispatches?: number;
}

export interface LogisticsBackpressureDecision {
  acceptDispatch: boolean;
  throttleRealtime: boolean;
  retryAfterSeconds: number;
  alertLevel: "healthy" | "watch" | "critical";
  reason: string;
}

export interface DeliverySlaAssessment {
  deliveryId: string;
  breaches: Array<{
    type: "dispatch_delay" | "pickup_delay" | "delivery_delay" | "seller_prep_delay" | "provider_response_delay" | "stale_tracking" | "eta_drift";
    severity: "warning" | "critical";
    thresholdMinutes: number;
    observedMinutes: number;
  }>;
  alertLevel: "healthy" | "watch" | "critical";
  escalation: "none" | "seller_notify" | "ops_review" | "provider_failover";
  latencyScore: number;
}

export interface LogisticsZoneSignal {
  zoneId: string;
  city: string;
  activeDeliveries: number;
  pendingDispatches: number;
  availableCapacity: number;
  sellerCount: number;
  averageEtaMinutes: number;
  providerFailureCount: number;
  slaBreachCount: number;
}

export interface LogisticsDensityDecision {
  zoneId: string;
  pressure: number;
  congestion: "low" | "medium" | "high" | "critical";
  capacityBalance: number;
  hotspot: boolean;
  recommendedAction: "normal_dispatch" | "pace_dispatch" | "rebalance_capacity" | "ops_intervention";
}

export interface DispatchCandidate {
  delivery: Pick<Delivery, "id" | "vendorId" | "mode" | "status" | "distanceKm" | "prepMinutes" | "etaMinutes" | "etaConfidence" | "createdAt" | "updatedAt">;
  sellerPriority?: number;
  zone: LogisticsZoneSignal;
  providerHealth?: LogisticsProviderHealth[];
  paymentReady?: boolean;
  sellerReady?: boolean;
}

export interface DispatchDecision {
  deliveryId: string;
  assignable: boolean;
  score: number;
  provider: DeliveryMode;
  failoverProvider?: DeliveryMode;
  priority: "critical" | "high" | "normal" | "deferred";
  reason: string;
  etaMinutes: number;
  density: LogisticsDensityDecision;
  degraded: boolean;
}

export interface ProviderFailoverDecision {
  provider: DeliveryMode;
  failedOverTo: DeliveryMode;
  deterministic: true;
  cooldownMinutes: number;
  reason: string;
  retryIsolated: boolean;
  degradedMode: boolean;
}

export interface AdaptiveEtaSignal {
  distanceKm: number;
  prepMinutes: number;
  mode: DeliveryMode;
  status?: DeliveryStatus;
  densityPressure: number;
  providerLatencyMs: number;
  historicalSlaScore: number;
  dispatchBacklog: number;
  cityLoad: number;
  lastEtaMinutes?: number | null;
  lastUpdatedAt?: string | null;
}
