/**
 * EC-2 Phase 8 — Transactional Communications
 * Email template rendering + provider abstraction + queue/retry.
 * Provider-agnostic: dispatches via configured provider when present, queues otherwise (degrade-safe).
 */

import { createHash } from "crypto";
import type { EmailMessage, EmailTemplateId } from "./types";

function id(seed: string): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

// ─── Templates ───────────────────────────────────────────────────────────────
type TemplateDef = { subject: (d: Record<string, string | number>) => string; body: (d: Record<string, string | number>) => string };

export const EMAIL_TEMPLATES: Record<EmailTemplateId, TemplateDef> = {
  order_confirmation: {
    subject: (d) => `Order ${d.orderNumber} confirmed`,
    body: (d) => `Hi ${d.name}, your order ${d.orderNumber} for ₹${d.total} is confirmed. We'll notify you when it ships.`,
  },
  shipment_update: {
    subject: (d) => `Order ${d.orderNumber}: ${d.status}`,
    body: (d) => `Your order ${d.orderNumber} is now ${d.status}. Track: ${d.trackingNumber ?? "pending"}.`,
  },
  return_update: {
    subject: (d) => `Return ${d.returnId}: ${d.status}`,
    body: (d) => `Your return ${d.returnId} for order ${d.orderNumber} is now ${d.status}. ${d.note ?? ""}`,
  },
  refund_update: {
    subject: (d) => `Refund ${d.status} for order ${d.orderNumber}`,
    body: (d) => `Your ${d.mode} refund of ₹${d.amount} for order ${d.orderNumber} is ${d.status}.`,
  },
  payout_update: {
    subject: (d) => `Payout ${d.status}: ₹${d.amount}`,
    body: (d) => `Your payout ${d.reference} of ₹${d.amount} is ${d.status}.`,
  },
  support_update: {
    subject: (d) => `Support ticket ${d.ticketNumber}: ${d.status}`,
    body: (d) => `Your support ticket ${d.ticketNumber} is now ${d.status}. ${d.note ?? ""}`,
  },
  admin_alert: {
    subject: (d) => `[Admin] ${d.title}`,
    body: (d) => `${d.message}`,
  },
};

// ─── Compose ─────────────────────────────────────────────────────────────────
export function composeEmail(template: EmailTemplateId, to: string, data: Record<string, string | number>): EmailMessage {
  const def = EMAIL_TEMPLATES[template];
  if (!def) throw new Error(`Unknown email template: ${template}`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error(`Invalid recipient email: ${to}`);
  const now = new Date().toISOString();
  return {
    id: id(`email-${template}-${to}-${now}`),
    template,
    to,
    subject: def.subject(data),
    body: def.body(data),
    data,
    state: "QUEUED",
    attempts: 0,
    createdAt: now,
    sentAt: null,
  };
}

// ─── Provider abstraction ────────────────────────────────────────────────────────
export type EmailProvider = {
  name: string;
  send: (msg: EmailMessage) => Promise<{ ok: boolean; error?: string }>;
};

export const MAX_EMAIL_ATTEMPTS = 3;

/**
 * Dispatch with retry. Degrade-safe: if no provider configured, the message stays QUEUED
 * (caller persists it for a worker to drain) — never throws on missing provider.
 */
export async function dispatchEmail(msg: EmailMessage, provider: EmailProvider | null): Promise<EmailMessage> {
  if (!provider) {
    return { ...msg, state: "QUEUED" };
  }
  let attempts = msg.attempts;
  while (attempts < MAX_EMAIL_ATTEMPTS) {
    attempts++;
    try {
      const res = await provider.send(msg);
      if (res.ok) {
        return { ...msg, state: "SENT", attempts, sentAt: new Date().toISOString() };
      }
    } catch {
      // retry on throw
    }
  }
  return { ...msg, state: "FAILED", attempts };
}

// ─── Queue helpers ───────────────────────────────────────────────────────────────
export function retryableEmails(queue: EmailMessage[]): EmailMessage[] {
  return queue.filter((m) => m.state === "FAILED" && m.attempts < MAX_EMAIL_ATTEMPTS);
}

export function emailQueueStats(queue: EmailMessage[]) {
  return {
    total: queue.length,
    queued: queue.filter((m) => m.state === "QUEUED").length,
    sent: queue.filter((m) => m.state === "SENT").length,
    failed: queue.filter((m) => m.state === "FAILED").length,
  };
}
