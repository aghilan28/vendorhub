"use client";

import { create } from "zustand";
import type { SellerOrderStatus } from "./types";

interface SellerUiState {
  productSearch: string;
  inventorySearch: string;
  orderStatus: SellerOrderStatus | "all";
  inventoryFilter: "all" | "low_stock" | "out_of_stock" | "archived";
  draftProductName: string;
  setProductSearch: (value: string) => void;
  setInventorySearch: (value: string) => void;
  setOrderStatus: (value: SellerOrderStatus | "all") => void;
  setInventoryFilter: (value: SellerUiState["inventoryFilter"]) => void;
  setDraftProductName: (value: string) => void;
}

export const useSellerStore = create<SellerUiState>((set) => ({
  productSearch: "",
  inventorySearch: "",
  orderStatus: "all",
  inventoryFilter: "all",
  draftProductName: "",
  setProductSearch: (productSearch) => set({ productSearch }),
  setInventorySearch: (inventorySearch) => set({ inventorySearch }),
  setOrderStatus: (orderStatus) => set({ orderStatus }),
  setInventoryFilter: (inventoryFilter) => set({ inventoryFilter }),
  setDraftProductName: (draftProductName) => set({ draftProductName }),
}));
