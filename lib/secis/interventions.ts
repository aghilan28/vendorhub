// KARTEX M4 — Change-event type catalog (for the visual Change Event Studio)
// and the intervention catalog (applied in the Evolution Studio).

import type { ChangeEventType, EntityKind, Intervention } from "./types";

export type ParamKind = "percent" | "currency" | "integer" | "number" | "select";

export interface EventParam {
  key: string;
  label: string;
  kind: ParamKind;
  defaultValue: number | string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help: string;
  options?: Array<{ value: string; label: string }>;
}

export interface ChangeEventTypeMeta {
  type: ChangeEventType;
  label: string;
  description: string;
  category: string;
  defaultMagnitude: number; // 0..1
  originKinds: EntityKind[]; // which entity kinds are sensible origins
  params: EventParam[];
}

const MAGNITUDE_PARAM: EventParam = {
  key: "magnitude",
  label: "Shock magnitude",
  kind: "percent",
  defaultValue: 70,
  min: 5,
  max: 100,
  step: 1,
  unit: "%",
  help: "Intensity of the change at its origin.",
};

export const CHANGE_EVENT_TYPES: ChangeEventTypeMeta[] = [
  {
    type: "supplier_failure",
    label: "Supplier Failure",
    description: "A supplier becomes unable to fulfil, starving downstream inventory and fulfilment.",
    category: "Supply",
    defaultMagnitude: 0.8,
    originKinds: ["supplier"],
    params: [MAGNITUDE_PARAM, { key: "outageDays", label: "Outage duration", kind: "integer", defaultValue: 7, min: 1, max: 60, step: 1, unit: "days", help: "How long the supplier is down." }],
  },
  {
    type: "demand_surge",
    label: "Demand Surge",
    description: "A sudden spike in demand stresses inventory, fulfilment, and delivery.",
    category: "Demand",
    defaultMagnitude: 0.65,
    originKinds: ["customer_segment", "category", "product", "marketing_channel"],
    params: [MAGNITUDE_PARAM, { key: "surgePct", label: "Demand increase", kind: "percent", defaultValue: 180, min: 20, max: 500, step: 10, unit: "%", help: "Spike above baseline demand." }],
  },
  {
    type: "inventory_shock",
    label: "Inventory Shock",
    description: "Stock is lost or written off at a node, propagating shortages.",
    category: "Inventory",
    defaultMagnitude: 0.7,
    originKinds: ["warehouse", "inventory_node", "dark_store"],
    params: [MAGNITUDE_PARAM, { key: "stockLossPct", label: "Stock lost", kind: "percent", defaultValue: 60, min: 5, max: 100, step: 5, unit: "%", help: "Share of stock unavailable." }],
  },
  {
    type: "price_change",
    label: "Price Change",
    description: "A pricing move shifts demand, margin, and competitive position.",
    category: "Pricing",
    defaultMagnitude: 0.5,
    originKinds: ["pricing_engine", "category", "product"],
    params: [MAGNITUDE_PARAM, { key: "pricePct", label: "Price change", kind: "percent", defaultValue: 15, min: -40, max: 60, step: 1, unit: "%", help: "Positive = increase, negative = cut." }],
  },
  {
    type: "delivery_failure",
    label: "Delivery Failure",
    description: "A courier or zone fails, degrading fulfilment and customer experience.",
    category: "Fulfilment",
    defaultMagnitude: 0.7,
    originKinds: ["courier", "delivery_zone"],
    params: [MAGNITUDE_PARAM, { key: "slaBreachPct", label: "SLA breach rate", kind: "percent", defaultValue: 45, min: 5, max: 100, step: 5, unit: "%", help: "Deliveries breaching SLA." }],
  },
  {
    type: "store_closure",
    label: "Store / Dark Store Closure",
    description: "A fulfilment location goes offline, rerouting load and demand.",
    category: "Fulfilment",
    defaultMagnitude: 0.75,
    originKinds: ["dark_store", "store"],
    params: [MAGNITUDE_PARAM, { key: "closureDays", label: "Closure duration", kind: "integer", defaultValue: 5, min: 1, max: 90, step: 1, unit: "days", help: "How long the location is closed." }],
  },
  {
    type: "competitor_entry",
    label: "Competitor Entry",
    description: "A competitor enters, pressuring demand, marketplace position, and price.",
    category: "Market",
    defaultMagnitude: 0.55,
    originKinds: ["category", "customer_segment", "marketing_channel"],
    params: [MAGNITUDE_PARAM, { key: "shareThreatPct", label: "Share at threat", kind: "percent", defaultValue: 20, min: 2, max: 60, step: 1, unit: "%", help: "Market share under threat." }],
  },
  {
    type: "policy_change",
    label: "Policy Change",
    description: "A regulatory or platform policy change affects operations and payments.",
    category: "Governance",
    defaultMagnitude: 0.5,
    originKinds: ["payment_gateway", "pricing_engine", "category"],
    params: [MAGNITUDE_PARAM, { key: "complianceCost", label: "Compliance cost", kind: "currency", defaultValue: 250000, min: 0, max: 50000000, step: 10000, unit: "₹", help: "One-off cost to comply." }],
  },
  {
    type: "custom",
    label: "Custom Event",
    description: "Model any change you choose, starting from any entity.",
    category: "Custom",
    defaultMagnitude: 0.6,
    originKinds: [
      "supplier",
      "warehouse",
      "dark_store",
      "store",
      "product",
      "category",
      "courier",
      "delivery_zone",
      "customer_segment",
      "payment_gateway",
      "pricing_engine",
      "marketing_channel",
      "inventory_node",
    ],
    params: [MAGNITUDE_PARAM],
  },
];

export function getEventTypeMeta(type: ChangeEventType): ChangeEventTypeMeta {
  return CHANGE_EVENT_TYPES.find((t) => t.type === type) ?? CHANGE_EVENT_TYPES[CHANGE_EVENT_TYPES.length - 1];
}

export const INTERVENTIONS: Intervention[] = [
  { id: "intv-backup-supplier", name: "Activate backup supplier", description: "Switch to a pre-qualified alternate supplier.", category: "mitigation", appliesTo: ["supplier_failure", "inventory_shock"], severityReduction: 0.35, recoveryBoost: 0.4, cost: 350000 },
  { id: "intv-safety-stock", name: "Release safety stock", description: "Draw down buffer inventory to cover the gap.", category: "mitigation", appliesTo: ["supplier_failure", "demand_surge", "inventory_shock"], severityReduction: 0.25, recoveryBoost: 0.3, cost: 120000 },
  { id: "intv-expedite-logistics", name: "Expedite logistics", description: "Prioritise and expedite affected shipments.", category: "recovery", appliesTo: ["delivery_failure", "store_closure", "supplier_failure"], severityReduction: 0.2, recoveryBoost: 0.45, cost: 200000 },
  { id: "intv-reroute-fulfilment", name: "Reroute fulfilment", description: "Shift load to healthy dark stores / couriers.", category: "operational", appliesTo: ["store_closure", "delivery_failure", "demand_surge"], severityReduction: 0.3, recoveryBoost: 0.35, cost: 90000 },
  { id: "intv-dynamic-repricing", name: "Dynamic repricing", description: "Adjust price to balance demand and margin.", category: "optimization", appliesTo: ["price_change", "competitor_entry", "demand_surge"], severityReduction: 0.22, recoveryBoost: 0.25, cost: 60000 },
  { id: "intv-demand-shaping", name: "Demand shaping", description: "Throttle promos / nudge substitution to flatten the spike.", category: "operational", appliesTo: ["demand_surge", "inventory_shock"], severityReduction: 0.28, recoveryBoost: 0.2, cost: 75000 },
  { id: "intv-retention-campaign", name: "Retention campaign", description: "Targeted offers to defend at-risk customers.", category: "strategic", appliesTo: ["competitor_entry", "delivery_failure", "price_change"], severityReduction: 0.18, recoveryBoost: 0.3, cost: 280000 },
  { id: "intv-payment-failover", name: "Payment failover", description: "Route payments to a redundant gateway.", category: "mitigation", appliesTo: ["policy_change", "delivery_failure"], severityReduction: 0.4, recoveryBoost: 0.5, cost: 150000 },
  { id: "intv-comms-plan", name: "Customer comms plan", description: "Proactive status comms to protect trust.", category: "operational", appliesTo: ["supplier_failure", "delivery_failure", "store_closure", "policy_change", "demand_surge", "inventory_shock", "price_change", "competitor_entry", "custom"], severityReduction: 0.1, recoveryBoost: 0.25, cost: 40000 },
];

export function getIntervention(id: string): Intervention | undefined {
  return INTERVENTIONS.find((i) => i.id === id);
}

export function interventionsFor(type: ChangeEventType): Intervention[] {
  return INTERVENTIONS.filter((i) => i.appliesTo.includes(type));
}
