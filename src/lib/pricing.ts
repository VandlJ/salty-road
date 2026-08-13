import { CouponKind } from "@/lib/constants";
import type { DeliveryMethod } from "@/lib/constants";

// Money maths shared by the checkout (which charges) and the coupon-validate
// endpoint (which previews to the customer). Both carried their own copy of
// the same arithmetic; they agreed, but nothing made them agree, and they had
// already drifted on how an unknown SKU is treated.
//
// Pure functions on plain data: testable without mocking Prisma, unlike the
// versions that lived inside the route handlers.

export type CartLine = { sku: string; qty: number };

/** The bits of a variant pricing needs — anything with these fields works. */
export type PricedVariant = { price: number; product: { category: string } };

export type DiscountCoupon = {
  // Prisma stores this as a plain string, so it arrives unnarrowed. Anything
  // that isn't "percent" is treated as a fixed amount — free_shipping never
  // reaches here, both callers handle it before discounting items.
  type: string;
  value: number;
  /** Empty means the coupon applies to every category. */
  categories: string[];
};

/**
 * How much of the cart a coupon actually covers, and the resulting discount.
 *
 * Lines whose SKU isn't in `variantBySku` are skipped rather than throwing —
 * the checkout validates every SKU before it gets here, and the preview
 * endpoint shouldn't 500 on a stale cart.
 *
 * A zero `eligibleSubtotal` means the coupon doesn't apply to anything in the
 * cart; callers surface that as "coupon_not_applicable" rather than silently
 * applying a discount of nothing.
 */
export function calculateCouponDiscount({
  items,
  variantBySku,
  coupon,
}: {
  items: CartLine[];
  variantBySku: Map<string, PricedVariant>;
  coupon: DiscountCoupon;
}): { eligibleSubtotal: number; discountAmount: number } {
  const appliesToEverything = coupon.categories.length === 0;

  let eligibleSubtotal = 0;
  for (const item of items) {
    const variant = variantBySku.get(item.sku);
    if (!variant) continue;
    if (appliesToEverything || coupon.categories.includes(variant.product.category)) {
      eligibleSubtotal += variant.price * item.qty;
    }
  }

  if (eligibleSubtotal === 0) return { eligibleSubtotal: 0, discountAmount: 0 };

  const discountAmount =
    coupon.type === CouponKind.Percent
      ? // Rounded to whole haléře; a percentage of an integer amount is
        // otherwise fractional.
        Math.round((eligibleSubtotal * coupon.value) / 100)
      : // A fixed-value coupon can never discount more than the eligible
        // portion, or the order total would go negative.
        Math.min(coupon.value, eligibleSubtotal);

  return { eligibleSubtotal, discountAmount };
}

/** Sum of the cart at list price, before any discount. */
export function cartSubtotal(items: CartLine[], variantBySku: Map<string, PricedVariant>): number {
  return items.reduce((sum, item) => {
    const variant = variantBySku.get(item.sku);
    return variant ? sum + variant.price * item.qty : sum;
  }, 0);
}

/**
 * Shipping actually charged. Pickup is always free, and a free-shipping
 * coupon waives the fee — the same rule previously written out separately in
 * the checkout route and in the checkout page's client-side total.
 */
export function resolveShippingFee({
  deliveryMethod,
  hasFreeShippingCoupon,
  baseFee,
}: {
  deliveryMethod: DeliveryMethod;
  hasFreeShippingCoupon: boolean;
  baseFee: number;
}): number {
  if (deliveryMethod === "pickup") return 0;
  return hasFreeShippingCoupon ? 0 : baseFee;
}
