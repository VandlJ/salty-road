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
  // Two independent coupon slots — a discount coupon (percent/fixed) and a
  // free_shipping coupon can both be active at once. Only the codes persist
  // — the discount amount/type is always re-derived from a fresh
  // /api/merch/coupon/validate call (or re-validated server-side at
  // checkout), never trusted from storage.
  couponCode: string | null;
  shippingCouponCode: string | null;
  // Same "only the choice persists" reasoning as couponCode — eligibility
  // and stock are always re-checked server-side at checkout.
  giftSku: string | null;
  addItem: (item: CartItem, maxQty?: number) => void;
  removeItem: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  setCoupon: (code: string | null) => void;
  setShippingCoupon: (code: string | null) => void;
  setGift: (sku: string | null) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      couponCode: null,
      shippingCouponCode: null,
      giftSku: null,
      addItem: (item, maxQty) =>
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku);
          if (existing) {
            // Cap at live stock so the user finds out here, not at checkout.
            const nextQty = Math.min(existing.qty + item.qty, maxQty ?? Infinity);
            return {
              items: state.items.map((i) =>
                i.sku === item.sku ? { ...i, qty: nextQty } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (sku) =>
        set((state) => {
          const items = state.items.filter((i) => i.sku !== sku);
          return items.length === 0
            ? { items, couponCode: null, shippingCouponCode: null, giftSku: null }
            : { items };
        }),
      updateQty: (sku, qty) =>
        set((state) => {
          const items = state.items.map((i) => (i.sku === sku ? { ...i, qty } : i));
          return items.length === 0
            ? { items, couponCode: null, shippingCouponCode: null, giftSku: null }
            : { items };
        }),
      setCoupon: (code) => set({ couponCode: code }),
      setShippingCoupon: (code) => set({ shippingCouponCode: code }),
      setGift: (sku) => set({ giftSku: sku }),
      clear: () => set({ items: [], couponCode: null, shippingCouponCode: null, giftSku: null }),
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
