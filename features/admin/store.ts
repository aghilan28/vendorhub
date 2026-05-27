"use client";

import { create } from "zustand";
import type { ModerationStatus, VendorStatus } from "./types";

interface AdminState {
  governanceSearch: string;
  moderationStatus: ModerationStatus | "all";
  vendorStatus: VendorStatus | "all";
  dashboardScope: "today" | "week" | "month";
  setGovernanceSearch: (value: string) => void;
  setModerationStatus: (value: AdminState["moderationStatus"]) => void;
  setVendorStatus: (value: AdminState["vendorStatus"]) => void;
  setDashboardScope: (value: AdminState["dashboardScope"]) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  governanceSearch: "",
  moderationStatus: "all",
  vendorStatus: "all",
  dashboardScope: "today",
  setGovernanceSearch: (governanceSearch) => set({ governanceSearch }),
  setModerationStatus: (moderationStatus) => set({ moderationStatus }),
  setVendorStatus: (vendorStatus) => set({ vendorStatus }),
  setDashboardScope: (dashboardScope) => set({ dashboardScope }),
}));
