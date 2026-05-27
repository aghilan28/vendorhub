import { buyerOrders, marketplaceProducts } from "@/features/marketplace/lib/data";
import { estimateDeliveryEta } from "./eta";
import type { Delivery, DeliveryPartner, DeliveryStatus } from "./types";

export const deliveryPartners: DeliveryPartner[] = [
  { id: "partner-self", name: "Seller self-delivery", mode: "seller_self", serviceLevel: "hyperlocal", phone: "+91 90030 10420", rating: 4.7, integrationStatus: "manual" },
  { id: "partner-shiprocket", name: "Shiprocket", mode: "shiprocket", serviceLevel: "same_day", rating: 4.4, integrationStatus: "placeholder" },
  { id: "partner-porter", name: "Porter local", mode: "porter", serviceLevel: "hyperlocal", rating: 4.5, integrationStatus: "placeholder" },
  { id: "partner-dunzo", name: "Dunzo task", mode: "dunzo", serviceLevel: "hyperlocal", rating: 4.3, integrationStatus: "placeholder" },
];

const eventTimes = {
  created: "2026-05-26T09:42:00.000+05:30",
  assigned: "2026-05-26T09:48:00.000+05:30",
  pickup: "2026-05-26T10:02:00.000+05:30",
  transit: "2026-05-26T10:13:00.000+05:30",
  nearby: "2026-05-26T10:28:00.000+05:30",
};

function buildDelivery(status: DeliveryStatus = "IN_TRANSIT"): Delivery {
  const order = buyerOrders[0];
  const product = order.items[0]?.product ?? marketplaceProducts[0];
  const partner = deliveryPartners[0];
  const eta = estimateDeliveryEta({
    distanceKm: 3.2,
    prepMinutes: product.vendor.fulfillmentPromiseMinutes,
    mode: partner.mode,
    serviceRadiusKm: product.vendor.serviceRadiusKm,
    trafficFactor: "normal",
  });

  return {
    id: `del-${order.id}`,
    orderId: order.id,
    orderCode: order.code,
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    vendorId: product.vendor.id,
    vendorName: product.vendor.name,
    deliveryAddress: `${order.deliveryAddress.line1}, ${order.deliveryAddress.locality}, Chennai ${order.deliveryAddress.pincode}`,
    mode: partner.mode,
    status,
    partner,
    assignedTo: "R. Suresh",
    assignedPhone: "+91 90030 10420",
    distanceKm: 3.2,
    prepMinutes: product.vendor.fulfillmentPromiseMinutes,
    etaMinutes: eta.estimatedMinutes,
    etaWindow: eta.window,
    etaConfidence: eta.confidence,
    promisedAt: "2026-05-26T10:42:00.000+05:30",
    createdAt: eventTimes.created,
    updatedAt: eventTimes.transit,
    shipment: { provider: "seller_self", externalShipmentId: "SELF-TNG-1042", syncStatus: "not_required" },
    etaLogs: [
      { id: "eta-del-1042-1", deliveryId: `del-${order.id}`, estimatedMinutes: eta.estimatedMinutes, confidence: eta.confidence, reason: eta.reason, createdAt: eventTimes.assigned },
      { id: "eta-del-1042-2", deliveryId: `del-${order.id}`, estimatedMinutes: 18, confidence: "high", reason: "Courier picked up and entered central Chennai corridor.", createdAt: eventTimes.transit },
    ],
    events: [
      { id: "evt-del-1042-created", deliveryId: `del-${order.id}`, status: "DELIVERY_PENDING", type: "dispatch_created", title: "Dispatch created", description: "Seller accepted the order and created a local delivery task.", occurredAt: eventTimes.created, actor: "seller", locationLabel: product.vendor.locality, etaMinutes: eta.estimatedMinutes },
      { id: "evt-del-1042-assigned", deliveryId: `del-${order.id}`, status: "READY_FOR_DISPATCH", type: "self_delivery_assigned", title: "Delivery assigned", description: "Seller self-delivery partner assigned with phone verification placeholder.", occurredAt: eventTimes.assigned, actor: "seller", locationLabel: product.vendor.locality, etaMinutes: eta.estimatedMinutes },
      { id: "evt-del-1042-pickup", deliveryId: `del-${order.id}`, status: "DISPATCHED", type: "dispatch_confirmed", title: "Dispatched", description: "Package collected after item count and bag seal check.", occurredAt: eventTimes.pickup, actor: "partner", locationLabel: product.vendor.locality, etaMinutes: 30 },
      { id: "evt-del-1042-transit", deliveryId: `del-${order.id}`, status: "IN_TRANSIT", type: "in_transit", title: "In transit", description: "Courier is moving through the local delivery corridor.", occurredAt: eventTimes.transit, actor: "partner", locationLabel: "T. Nagar main road", etaMinutes: 18 },
    ],
    verification: { state: "pending" },
  };
}

export const seedDeliveries: Delivery[] = [
  buildDelivery("IN_TRANSIT"),
  {
    ...buildDelivery("DELIVERY_PENDING"),
    id: "del-kx-1043",
    orderId: "order-kx-1043",
    orderCode: "KX-1043",
    buyerName: "Nisha Rao",
    deliveryAddress: "22, Canal Bank Road, Adyar, Chennai 600020",
    vendorName: "Adyar Care Pharmacy",
    mode: "shiprocket",
    partner: deliveryPartners[1],
    distanceKm: 5.8,
    etaWindow: "54-66 min",
    etaConfidence: "medium",
    shipment: { provider: "shiprocket", externalShipmentId: "SR-DRAFT-KX1043", shiprocketAwb: "AWB pending", syncStatus: "pending", syncMessage: "Awaiting shipment creation confirmation placeholder." },
    events: [
      { id: "evt-del-1043-created", deliveryId: "del-kx-1043", status: "DELIVERY_PENDING", type: "dispatch_created", title: "Awaiting dispatch", description: "Order is packed; seller must confirm pickup handoff.", occurredAt: "2026-05-26T10:06:00.000+05:30", actor: "seller", locationLabel: "Adyar" },
    ],
  },
  {
    ...buildDelivery("FAILED"),
    id: "del-kx-1038",
    orderId: "order-kx-1038",
    orderCode: "KX-1038",
    buyerName: "Vikram B",
    deliveryAddress: "18, Arcot Road, Kodambakkam, Chennai 600024",
    vendorName: "Mylapore Bakehouse",
    distanceKm: 7.1,
    etaWindow: "Retry pending",
    etaConfidence: "low",
    shipment: { provider: "porter", porterBookingId: "PTR-KX1038", syncStatus: "failed", syncMessage: "Partner marked customer unreachable; seller action required." },
    events: [
      { id: "evt-del-1038-failed", deliveryId: "del-kx-1038", status: "FAILED", type: "failed", title: "Delivery attempt failed", description: "Customer was unreachable after two calls. Dispatch team can retry or initiate return.", occurredAt: "2026-05-26T08:58:00.000+05:30", actor: "partner", locationLabel: "Kodambakkam" },
    ],
    recovery: { reason: "unreachable_customer", action: "customer_contact", runAfter: "2026-05-26T09:13:00.000+05:30", attempts: 1, status: "pending" },
  },
];
