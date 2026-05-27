import { create } from "zustand";
import type { SearchFilters, SearchSort } from "@/features/intelligence/types";

interface SearchState {
  query: string;
  filters: SearchFilters;
  setQuery: (query: string) => void;
  setCategory: (category: string) => void;
  setAvailability: (availability: SearchFilters["availability"]) => void;
  setSort: (sort: SearchSort) => void;
  setPrice: (price: NonNullable<SearchFilters["price"]>) => void;
  setRating: (rating: NonNullable<SearchFilters["rating"]>) => void;
  setDeliveryTime: (deliveryTime: NonNullable<SearchFilters["deliveryTime"]>) => void;
  reset: () => void;
}

const defaultFilters: SearchFilters = {
  category: "all",
  availability: "available",
  sort: "intelligent",
  price: "all",
  rating: "all",
  deliveryTime: "all",
  radiusKm: 6,
  nearbyOnly: false,
};

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  filters: defaultFilters,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set((state) => ({ filters: { ...state.filters, category } })),
  setAvailability: (availability) => set((state) => ({ filters: { ...state.filters, availability } })),
  setSort: (sort) => set((state) => ({ filters: { ...state.filters, sort } })),
  setPrice: (price) => set((state) => ({ filters: { ...state.filters, price } })),
  setRating: (rating) => set((state) => ({ filters: { ...state.filters, rating } })),
  setDeliveryTime: (deliveryTime) => set((state) => ({ filters: { ...state.filters, deliveryTime } })),
  reset: () => set({ query: "", filters: defaultFilters }),
}));
