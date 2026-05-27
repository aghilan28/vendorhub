"use client";

import { create } from "zustand";

type OperationsState = {
  selectedDomain: string;
  setSelectedDomain: (domain: string) => void;
};

export const useOperationsStore = create<OperationsState>((set) => ({
  selectedDomain: "all",
  setSelectedDomain: (domain) => set({ selectedDomain: domain }),
}));
