/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore, cartTotal, cartCount, type CartItem } from "@/lib/cartStore";

const item: CartItem = {
  sku: "TEST-M",
  productSlug: "test-hoodie",
  name: "Test Hoodie",
  variantLabel: "M",
  unitPrice: 65000,
  qty: 1,
};

describe("cartStore", () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], couponCode: null, shippingCouponCode: null, giftSku: null });
  });

  it("adds a new item", () => {
    useCartStore.getState().addItem(item);
    expect(useCartStore.getState().items).toEqual([item]);
  });

  it("merges quantity for an existing sku", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem({ ...item, qty: 2 });
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].qty).toBe(3);
  });

  it("caps a merged quantity at the live stock limit", () => {
    useCartStore.getState().addItem(item);
    // Adding 5 more of a variant that only has 3 in stock must land on 3,
    // not 6 — the customer finds out here instead of at checkout.
    useCartStore.getState().addItem({ ...item, qty: 5 }, 3);
    expect(useCartStore.getState().items[0].qty).toBe(3);
  });

  it("does not cap when no maxQty is given", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem({ ...item, qty: 50 });
    expect(useCartStore.getState().items[0].qty).toBe(51);
  });

  it("removes an item by sku", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().addItem({ ...item, sku: "TEST-L" });
    useCartStore.getState().removeItem(item.sku);
    expect(useCartStore.getState().items.map((i) => i.sku)).toEqual(["TEST-L"]);
  });

  it("clears both coupon slots and gift when removeItem empties the cart", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().setCoupon("TEST10");
    useCartStore.getState().setShippingCoupon("POSTAFREE");
    useCartStore.getState().setGift("TEST-STICKER");
    useCartStore.getState().removeItem(item.sku);

    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.couponCode).toBeNull();
    expect(state.shippingCouponCode).toBeNull();
    expect(state.giftSku).toBeNull();
  });

  it("updateQty clears both coupon slots and gift too if called against an empty cart", () => {
    // updateQty never removes items itself, so this only exercises the same
    // defensive "items.length === 0" branch removeItem already covers above
    // — kept as its own test since it's a separate code path in the store.
    useCartStore.setState({
      items: [],
      couponCode: "TEST10",
      shippingCouponCode: "POSTAFREE",
      giftSku: "TEST-STICKER",
    });
    useCartStore.getState().updateQty(item.sku, 5);
    const state = useCartStore.getState();
    expect(state.couponCode).toBeNull();
    expect(state.shippingCouponCode).toBeNull();
    expect(state.giftSku).toBeNull();
  });

  it("updateQty changes quantity without touching coupons/gift when cart stays non-empty", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().setCoupon("TEST10");
    useCartStore.getState().setShippingCoupon("POSTAFREE");
    useCartStore.getState().updateQty(item.sku, 4);
    const state = useCartStore.getState();
    expect(state.items[0].qty).toBe(4);
    expect(state.couponCode).toBe("TEST10");
    expect(state.shippingCouponCode).toBe("POSTAFREE");
  });

  it("the discount and shipping coupon slots are independent", () => {
    useCartStore.getState().setCoupon("TEST10");
    useCartStore.getState().setShippingCoupon("POSTAFREE");
    const state = useCartStore.getState();
    expect(state.couponCode).toBe("TEST10");
    expect(state.shippingCouponCode).toBe("POSTAFREE");

    // Clearing one must not touch the other.
    useCartStore.getState().setCoupon(null);
    expect(useCartStore.getState().shippingCouponCode).toBe("POSTAFREE");
  });

  it("clear() resets items, both coupon slots, and gift", () => {
    useCartStore.getState().addItem(item);
    useCartStore.getState().setCoupon("TEST10");
    useCartStore.getState().setShippingCoupon("POSTAFREE");
    useCartStore.getState().setGift("TEST-STICKER");
    useCartStore.getState().clear();
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.couponCode).toBeNull();
    expect(state.shippingCouponCode).toBeNull();
    expect(state.giftSku).toBeNull();
  });

  it("cartTotal sums line totals across items", () => {
    expect(cartTotal([item, { ...item, sku: "TEST-L", qty: 2 }])).toBe(65000 * 3);
  });

  it("cartTotal returns 0 for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });

  it("cartCount sums quantities across items", () => {
    expect(cartCount([item, { ...item, sku: "TEST-L", qty: 2 }])).toBe(3);
  });
});
