// MCP-0C — Seller Workflow Engine (Section MCP-0C.11)

import type { InventorySummary, OrderOpsSummary, PricingSummary, StoreHealth } from "./types";

export type WorkflowId =
  | "low_stock"
  | "promotion"
  | "price_change"
  | "store_verification"
  | "catalog_approval"
  | "return"
  | "refund";

export type WorkflowState = "idle" | "triggered" | "in_progress" | "blocked" | "completed";

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  states: WorkflowState[];
  description: string;
}

export const WORKFLOWS: WorkflowDefinition[] = [
  { id: "low_stock", name: "Low Stock Replenishment", states: ["idle", "triggered", "in_progress", "completed"], description: "Detect low/out stock and drive reorder." },
  { id: "promotion", name: "Promotion Launch", states: ["idle", "in_progress", "completed"], description: "Create, schedule and launch a promotion." },
  { id: "price_change", name: "Price Change", states: ["idle", "in_progress", "blocked", "completed"], description: "Validate and apply price updates." },
  { id: "store_verification", name: "Store Verification", states: ["idle", "triggered", "in_progress", "completed"], description: "Complete store verification." },
  { id: "catalog_approval", name: "Catalog Approval", states: ["idle", "triggered", "in_progress", "completed"], description: "Publish products through governance." },
  { id: "return", name: "Return Handling", states: ["idle", "triggered", "in_progress", "completed"], description: "Process buyer returns." },
  { id: "refund", name: "Refund Handling", states: ["idle", "triggered", "in_progress", "completed"], description: "Issue and reconcile refunds." },
];

const TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  idle: ["triggered", "in_progress"],
  triggered: ["in_progress", "idle"],
  in_progress: ["blocked", "completed"],
  blocked: ["in_progress"],
  completed: [],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ActiveWorkflow {
  id: WorkflowId;
  name: string;
  state: WorkflowState;
  reason: string;
  count: number;
}

/** Detects which workflows are currently triggered by the live operating state. */
export function detectWorkflows(derived: {
  store: StoreHealth;
  inventory: InventorySummary;
  pricing: PricingSummary;
  orders: OrderOpsSummary;
}): ActiveWorkflow[] {
  const active: ActiveWorkflow[] = [];

  const lowOrOut = derived.inventory.low + derived.inventory.out;
  if (lowOrOut > 0) {
    active.push({ id: "low_stock", name: "Low Stock Replenishment", state: "triggered", reason: `${lowOrOut} products at/below reorder point`, count: lowOrOut });
  }
  if (!derived.store.verified) {
    active.push({ id: "store_verification", name: "Store Verification", state: "triggered", reason: "Store not yet verified", count: 1 });
  }
  if (derived.pricing.belowMarginCount > 0) {
    active.push({ id: "price_change", name: "Price Change", state: "triggered", reason: `${derived.pricing.belowMarginCount} products below margin threshold`, count: derived.pricing.belowMarginCount });
  }
  const returns = derived.orders.items.filter((o) => o.status === "delivered").length;
  if (returns > 0) {
    active.push({ id: "return", name: "Return Handling", state: "idle", reason: `${returns} delivered orders eligible for returns`, count: returns });
  }
  return active;
}
