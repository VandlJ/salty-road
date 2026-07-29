"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  sku: string;
  productSlug: string;
  name: string;
  variantLabel: string;
  // Display-only snapshot taken at add-time. The real price is always
  // recomputed server-side at checkout — never trust this for payment.
  unitPrice: number;
  qty: number;
  image?: string | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, qty: i.qty + item.qty } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (sku) =>
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      updateQty: (sku, qty) =>
        set((state) => ({
          items: state.items.map((i) => (i.sku === sku ? { ...i, qty } : i)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "salty-road-cart" }
  )
);

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.qty, 0);
}
