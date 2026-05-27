"use client";

import type { MarketplaceRealtimeEvent } from "./types";

const EVENT_NAME = "vendorhub:marketplace-realtime-event";
const TAB_SYNC_CHANNEL = "vendorhub:realtime-tab-sync";
const EVENT_DEDUP_TTL_MS = 30_000;
const LEASE_KEY = "vendorhub:realtime-leader";
const LEASE_TTL_MS = 12_000;
const LEASE_RENEW_MS = 4_000;
const TAB_ID_KEY = "vendorhub:realtime-tab-id";

let broadcastChannel: BroadcastChannel | null = null;
const recentEvents = new Map<string, number>();
const tabState =
  typeof window === "undefined"
    ? null
    : {
        tabId: "",
        leaderRenewTimer: null as number | null,
      };

function getBroadcastChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  broadcastChannel ??= new BroadcastChannel(TAB_SYNC_CHANNEL);
  return broadcastChannel;
}

function getTabId() {
  if (typeof window === "undefined") return "server";
  if (!tabState) return "server";
  if (tabState.tabId) return tabState.tabId;

  const existing = window.sessionStorage.getItem(TAB_ID_KEY);
  if (existing) {
    tabState.tabId = existing;
    return existing;
  }

  const generated = `tab-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  window.sessionStorage.setItem(TAB_ID_KEY, generated);
  tabState.tabId = generated;
  return generated;
}

function now() {
  return Date.now();
}

function readLease() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LEASE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { ownerId?: string; expiresAt?: number };
    if (!parsed.ownerId || typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt <= now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(ownerId: string) {
  if (typeof window === "undefined") return false;

  const current = readLease();
  if (current && current.ownerId !== ownerId) return false;

  window.localStorage.setItem(
    LEASE_KEY,
    JSON.stringify({
      ownerId,
      expiresAt: now() + LEASE_TTL_MS,
    }),
  );
  return true;
}

function renewLease(ownerId: string) {
  if (typeof window === "undefined") return false;
  const current = readLease();
  if (current && current.ownerId !== ownerId) return false;
  return writeLease(ownerId);
}

function releaseLease(ownerId: string) {
  if (typeof window === "undefined") return;
  const current = readLease();
  if (current && current.ownerId === ownerId) {
    window.localStorage.removeItem(LEASE_KEY);
  }
}

export function getRealtimeTabId() {
  return getTabId();
}

export function isRealtimeLeader() {
  const lease = readLease();
  return Boolean(lease && lease.ownerId === getTabId());
}

export function getRealtimeLeaderTabId() {
  return readLease()?.ownerId;
}

export function acquireRealtimeLeaderLease() {
  if (typeof window === "undefined") return false;
  const ownerId = getTabId();
  const acquired = writeLease(ownerId);

  if (acquired && tabState && !tabState.leaderRenewTimer) {
    tabState.leaderRenewTimer = window.setInterval(() => {
      if (!renewLease(ownerId)) {
        if (tabState?.leaderRenewTimer) {
          clearInterval(tabState.leaderRenewTimer);
          tabState.leaderRenewTimer = null;
        }
      }
    }, LEASE_RENEW_MS);
  }

  return acquired;
}

export function releaseRealtimeLeaderLease() {
  if (typeof window === "undefined") return;
  const ownerId = getTabId();
  releaseLease(ownerId);
  if (tabState?.leaderRenewTimer) {
    clearInterval(tabState.leaderRenewTimer);
    tabState.leaderRenewTimer = null;
  }
}

export function isDuplicateRealtimeEvent(event: MarketplaceRealtimeEvent) {
  const seenAtNow = now();
  for (const [id, seenAt] of recentEvents.entries()) {
    if (seenAtNow - seenAt > EVENT_DEDUP_TTL_MS) recentEvents.delete(id);
  }

  if (recentEvents.has(event.id)) return true;
  recentEvents.set(event.id, seenAtNow);
  return false;
}

export function publishMarketplaceRealtimeEvent(event: MarketplaceRealtimeEvent) {
  if (typeof window === "undefined") return;
  if (isDuplicateRealtimeEvent(event)) return;
  window.dispatchEvent(new CustomEvent<MarketplaceRealtimeEvent>(EVENT_NAME, { detail: event }));

  const channel = getBroadcastChannel();
  channel?.postMessage(event);
}

export function subscribeMarketplaceRealtimeEvents(listener: (event: MarketplaceRealtimeEvent) => void) {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: Event) => {
    listener((event as CustomEvent<MarketplaceRealtimeEvent>).detail);
  };
  const channel = getBroadcastChannel();
  const tabHandler = (event: MessageEvent<MarketplaceRealtimeEvent>) => {
    const detail = { ...event.data, source: "tab-sync" as const };
    if (isDuplicateRealtimeEvent(detail)) return;
    window.dispatchEvent(new CustomEvent<MarketplaceRealtimeEvent>(EVENT_NAME, { detail }));
  };

  window.addEventListener(EVENT_NAME, handler);
  channel?.addEventListener("message", tabHandler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    channel?.removeEventListener("message", tabHandler);
  };
}

export function createLocalRealtimeEvent(input: Omit<MarketplaceRealtimeEvent, "id" | "createdAt" | "source"> & { source?: MarketplaceRealtimeEvent["source"]; createdAt?: string }) {
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    ...input,
    id: `rt-${input.type}-${input.entityId ?? input.table}-${createdAt}-${getTabId()}`,
    source: input.source ?? "local",
    createdAt,
  } satisfies MarketplaceRealtimeEvent;
}
