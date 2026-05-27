import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  commandMenuOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setCommandMenuOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  commandMenuOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandMenuOpen: (commandMenuOpen) => set({ commandMenuOpen }),
}));
