"use client";

import { create } from "zustand";
import type { DeliveryMode, DeliveryStatus } from "@/features/logistics/types";

interface DeliveryState {
  trackingExpanded: boolean;
  selectedDeliveryId?: string;
  dispatchStatus: DeliveryStatus | "all";
  deliveryMode: DeliveryMode | "all";
  etaVisible: boolean;
  setTrackingExpanded: (trackingExpanded: boolean) => void;
  setSelectedDeliveryId: (selectedDeliveryId?: string) => void;
  setDispatchStatus: (dispatchStatus: DeliveryStatus | "all") => void;
  setDeliveryMode: (deliveryMode: DeliveryMode | "all") => void;
  setEtaVisible: (etaVisible: boolean) => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
  trackingExpanded: true,
  dispatchStatus: "all",
  deliveryMode: "all",
  etaVisible: true,
  setTrackingExpanded: (trackingExpanded) => set({ trackingExpanded }),
  setSelectedDeliveryId: (selectedDeliveryId) => set({ selectedDeliveryId }),
  setDispatchStatus: (dispatchStatus) => set({ dispatchStatus }),
  setDeliveryMode: (deliveryMode) => set({ deliveryMode }),
  setEtaVisible: (etaVisible) => set({ etaVisible }),
}));
