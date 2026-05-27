import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((cartItem) => cartItem.product.id === item.product.id);

          if (existing) {
            return {
              items: state.items.map((cartItem) =>
                cartItem.id === existing.id
                  ? { ...cartItem, quantity: Math.min(cartItem.quantity + item.quantity, cartItem.product.stockCount) }
                  : cartItem,
              ),
            };
          }

          return { items: [...state.items, item] };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stockCount || 1)) } : item,
          ),
        })),
      setItems: (items) => set({ items }),
      clearCart: () => set({ items: [] }),
    }),
    { name: "vendorhub-cart" },
  ),
);
