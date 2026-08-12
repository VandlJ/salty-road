// Single source of truth for the String columns that are really enums, and
// for the input formats validated on both sides of the wire.
//
// Prisma has no enum for any of these — schema.prisma documents the allowed
// values in comments only — so before this file the literals were spread
// across the codebase (Registration.status alone appeared in 24 places) with
// nothing keeping them in sync. Add a value here, not at the call site.

// Each set is declared once as a named object (readable at the call site:
// RegStatus.Accepted, not a bare "accepted" or an array index) plus the
// tuple of its values, which is what isOneOf validates untrusted input
// against. Prisma types these columns as plain `string`, so a literal
// written inline gets no checking at all — hence the named members.
export const RegStatus = {
  Pending: "pending",
  Accepted: "accepted",
  Declined: "declined",
} as const;
export const REGISTRATION_STATUS = Object.values(RegStatus);
export type RegistrationStatus = (typeof RegStatus)[keyof typeof RegStatus];

/** Registration fee payment. Distinct from OrderStatus, which tracks shop orders. */
export const PayStatus = {
  Pending: "pending",
  Paid: "paid",
} as const;
export const PAYMENT_STATUS = Object.values(PayStatus);
export type PaymentStatus = (typeof PayStatus)[keyof typeof PayStatus];

export const OrderStatusValue = {
  Pending: "pending",
  Paid: "paid",
  Shipped: "shipped",
  Cancelled: "cancelled",
} as const;
export const ORDER_STATUS = Object.values(OrderStatusValue);
export type OrderStatus = (typeof OrderStatusValue)[keyof typeof OrderStatusValue];

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
