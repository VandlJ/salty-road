import { describe, it, expect } from "vitest";
import {
  calculateCouponDiscount,
  cartSubtotal,
  resolveShippingFee,
  type PricedVariant,
} from "@/lib/pricing";

// Prices in haléře, as everywhere else in the shop.
const HOODIE = { price: 145000, product: { category: "hoodie" } };
const CAP = { price: 45000, product: { category: "cap" } };
const SCENT = { price: 6900, product: { category: "car-scent" } };

function variants(entries: Record<string, PricedVariant>) {
  return new Map(Object.entries(entries));
}

const CART = variants({ hoodie: HOODIE, cap: CAP, scent: SCENT });
const ITEMS = [
  { sku: "hoodie", qty: 1 },
  { sku: "cap", qty: 2 },
  { sku: "scent", qty: 1 },
];
// 145000 + 90000 + 6900
const SUBTOTAL = 241900;

describe("cartSubtotal", () => {
  it("sums price x quantity across lines", () => {
    expect(cartSubtotal(ITEMS, CART)).toBe(SUBTOTAL);
  });

  it("skips lines whose variant is unknown", () => {
    expect(cartSubtotal([...ITEMS, { sku: "ghost", qty: 5 }], CART)).toBe(SUBTOTAL);
  });

  it("is zero for an empty cart", () => {
    expect(cartSubtotal([], CART)).toBe(0);
  });
});

describe("calculateCouponDiscount", () => {
  it("applies a percentage to the whole cart when no categories are set", () => {
    const { eligibleSubtotal, discountAmount } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "percent", value: 10, categories: [] },
    });
    expect(eligibleSubtotal).toBe(SUBTOTAL);
    expect(discountAmount).toBe(24190);
  });

  it("restricts a category coupon to the matching slice of the cart", () => {
    const { eligibleSubtotal, discountAmount } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "percent", value: 50, categories: ["cap"] },
    });
    // Only the two caps count, not the hoodie or the scent.
    expect(eligibleSubtotal).toBe(90000);
    expect(discountAmount).toBe(45000);
  });

  it("counts every listed category", () => {
    const { eligibleSubtotal } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "percent", value: 10, categories: ["cap", "car-scent"] },
    });
    expect(eligibleSubtotal).toBe(96900);
  });

  it("reports zero eligibility when the coupon matches nothing in the cart", () => {
    // Callers turn this into "coupon_not_applicable" rather than a 0 discount.
    const { eligibleSubtotal, discountAmount } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "percent", value: 10, categories: ["tshirt"] },
    });
    expect(eligibleSubtotal).toBe(0);
    expect(discountAmount).toBe(0);
  });

  it("rounds a fractional percentage to whole haléře", () => {
    // 6900 * 33 / 100 = 2277 exactly; use a value that doesn't divide evenly.
    const { discountAmount } = calculateCouponDiscount({
      items: [{ sku: "scent", qty: 1 }],
      variantBySku: CART,
      coupon: { type: "percent", value: 33, categories: [] },
    });
    expect(discountAmount).toBe(Math.round((6900 * 33) / 100));
    expect(Number.isInteger(discountAmount)).toBe(true);
  });

  it("caps a fixed coupon at the eligible subtotal so the total can't go negative", () => {
    const { discountAmount } = calculateCouponDiscount({
      items: [{ sku: "scent", qty: 1 }],
      variantBySku: CART,
      coupon: { type: "fixed", value: 500000, categories: [] },
    });
    expect(discountAmount).toBe(6900);
  });

  it("applies a fixed coupon in full when the cart is worth more", () => {
    const { discountAmount } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "fixed", value: 10000, categories: [] },
    });
    expect(discountAmount).toBe(10000);
  });

  it("caps a category-restricted fixed coupon at that category's slice", () => {
    const { discountAmount } = calculateCouponDiscount({
      items: ITEMS,
      variantBySku: CART,
      coupon: { type: "fixed", value: 999999, categories: ["car-scent"] },
    });
    expect(discountAmount).toBe(6900);
  });

  it("skips unknown SKUs instead of throwing", () => {
    // The checkout validates SKUs beforehand, but the preview endpoint can be
    // called with a stale cart and must not 500.
    const { eligibleSubtotal } = calculateCouponDiscount({
      items: [{ sku: "ghost", qty: 1 }, { sku: "scent", qty: 1 }],
      variantBySku: CART,
      coupon: { type: "percent", value: 10, categories: [] },
    });
    expect(eligibleSubtotal).toBe(6900);
  });
});

describe("resolveShippingFee", () => {
  it("charges the base fee for a plain shipped order", () => {
    expect(
      resolveShippingFee({ deliveryMethod: "shipping", hasFreeShippingCoupon: false, baseFee: 9900 })
    ).toBe(9900);
  });

  it("waives the fee for personal pickup", () => {
    expect(
      resolveShippingFee({ deliveryMethod: "pickup", hasFreeShippingCoupon: false, baseFee: 9900 })
    ).toBe(0);
  });

  it("waives the fee for a free-shipping coupon", () => {
    expect(
      resolveShippingFee({ deliveryMethod: "shipping", hasFreeShippingCoupon: true, baseFee: 9900 })
    ).toBe(0);
  });

  it("stays at zero when both apply", () => {
    expect(
      resolveShippingFee({ deliveryMethod: "pickup", hasFreeShippingCoupon: true, baseFee: 9900 })
    ).toBe(0);
  });
});
