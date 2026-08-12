// Single source of truth for the String columns that are really enums, and
// for the input formats validated on both sides of the wire.
//
// Prisma has no enum for any of these — schema.prisma documents the allowed
// values in comments only — so before this file the literals were spread
// across the codebase (Registration.status alone appeared in 24 places) with
// nothing keeping them in sync. Add a value here, not at the call site.

export const REGISTRATION_STATUS = ["pending", "accepted", "declined"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUS)[number];

/** Registration fee payment. Distinct from ORDER_STATUS, which tracks shop orders. */
export const PAYMENT_STATUS = ["pending", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const ORDER_STATUS = ["pending", "paid", "shipped", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const PAYMENT_METHOD = ["bank_transfer", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const DELIVERY_METHOD = ["shipping", "pickup"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHOD)[number];

export const COUPON_TYPE = ["percent", "fixed", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPE)[number];

// Deliberately an open list, unlike the sets above: the admin merch form
// offers these as options but also accepts a free-text category, so this is
// a suggestion list for the UI, never a validation gate.
export const MERCH_CATEGORY_SUGGESTIONS = ["hoodie", "tshirt", "car-scent", "cap"] as const;

/**
 * Narrowing guard for the sets above — `isOneOf(ORDER_STATUS, body.status)`
 * both validates untrusted input and narrows its type in one step.
 */
export function isOneOf<const T extends readonly string[]>(
  allowed: T,
  value: unknown
): value is T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

// Deliberately permissive: real address-level e-mail validation is a losing
// game, and the only thing that actually proves an address works is sending
// to it. This just catches typos and obvious junk.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Digits plus the separators people actually type. Length is generous
// because the field carries an international dial code.
export const PHONE_RE = /^[0-9+() .-]{6,24}$/;

// Server-side length caps for checkout's customer fields. The client form
// mirrors these on its inputs; keeping both sides pointed at this object is
// what stops them drifting apart.
export const CHECKOUT_MAX_LEN = {
  customerName: 100,
  customerEmail: 200,
  customerPhone: 24,
  address: 300,
} as const;
