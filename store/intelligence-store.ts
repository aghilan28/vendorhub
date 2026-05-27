"use client";

import { create } from "zustand";
import { compactBehavioralEvents } from "@/features/intelligence/behavioral-events";
import type { BehavioralCommerceEvent } from "@/features/intelligence/types";

interface IntelligenceState {
  events: BehavioralCommerceEvent[];
  rankingMode: "adaptive" | "fallback";
  recordEvent: (event: Omit<BehavioralCommerceEvent, "createdAt">) => void;
  setRankingMode: (mode: "adaptive" | "fallback") => void;
  clearBehavioralSignals: () => void;
}

export const useIntelligenceStore = create<IntelligenceState>((set) => ({
  events: [],
  rankingMode: "adaptive",
  recordEvent: (event) =>
    set((state) => ({
      events: compactBehavioralEvents([...state.events, { ...event, createdAt: new Date().toISOString() }]),
    })),
  setRankingMode: (rankingMode) => set({ rankingMode }),
  clearBehavioralSignals: () => set({ events: [] }),
}));
