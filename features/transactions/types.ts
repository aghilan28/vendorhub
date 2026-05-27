import type {
  AuditEntry,
  CartItem,
  CheckoutAddress,
  MoneyBreakdown,
  Order,
  OrderHistoryEntry,
  OrderStatus,
  PaymentStatus,
  PaymentTransaction,
  TransactionNotification,
} from "@/types";

export type {
  AuditEntry,
  CartItem,
  CheckoutAddress,
  MoneyBreakdown,
  Order,
  OrderHistoryEntry,
  PaymentTransaction,
  TransactionNotification,
};

export type CheckoutStep = "address" | "review" | "payment" | "confirmation";
export type TransactionFailureCode = "EMPTY_CART" | "INVALID_QUANTITY" | "OUT_OF_STOCK" | "PAYMENT_FAILED" | "INVALID_TRANSITION" | "LOCK_CONTENTION" | "CHECKOUT_RETRY";
export type AtomicCheckoutState = "idle" | "validating" | "locking_inventory" | "payment_pending" | "confirmed" | "failed" | "recovering";

export interface InventoryRecord {
  productId: string;
  available: number;
  reserved: number;
  lowStockThreshold: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  updatedAt: string;
}

export interface CheckoutInput {
  address: CheckoutAddress;
  deliverySlot: string;
  paymentMethod: PaymentTransaction["method"];
  orderNote?: string;
  idempotencyKey?: string;
}

export interface AtomicCheckoutProgress {
  state: AtomicCheckoutState;
  idempotencyKey?: string;
  transactionId?: string;
  orderIds: string[];
  orderNumbers: string[];
  paymentReference?: string;
  message: string;
  retryable: boolean;
}

export interface CheckoutResult {
  order: Order;
  inventory: InventoryRecord[];
}

export interface TransactionError {
  code: TransactionFailureCode;
  title: string;
  message: string;
  recoveryAction: string;
}

export interface OrderTransitionResult {
  order: Order;
  historyEntry: OrderHistoryEntry;
  auditEntry: AuditEntry;
  notification?: TransactionNotification;
}

export interface PaymentAttempt {
  status: PaymentStatus;
  transaction?: PaymentTransaction;
  error?: TransactionError;
}

export interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  actor: "seller" | "admin" | "system" | "buyer";
  note: string;
}
