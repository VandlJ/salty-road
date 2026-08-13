import { z } from "zod";
import { EMAIL_RE, PHONE_RE, PAYMENT_METHOD, DELIVERY_METHOD } from "@/lib/constants";

// One definition of what a valid checkout submission looks like, imported by
// both the API route that validates it and the form that collects it.
//
// The lengths used to live in two places: CHECKOUT_MAX_LEN on the server and
// hand-written maxLength attributes on the inputs. They happened to agree —
// the client's were stricter, so nothing was rejected server-side that the
// form allowed — but nothing kept them that way, and the two sets were
// arrived at independently.
//
// Replacing the hand-rolled cascade also removes a class of bug the route's
// own comment documented: a non-string field slipped past the length guard
// (which only checked strings) and surfaced as an opaque 500 from Prisma
// instead of a 400, until the type check was moved ahead of it by hand.

export const MAX_ITEM_LINES = 20;
export const MAX_QTY_PER_LINE = 20;

/** Per-field caps. The form reads these for its maxLength attributes. */
export const CHECKOUT_FIELD_MAX = {
  firstName: 49,
  lastName: 49,
  customerEmail: 200,
  customerPhone: 24,
  street: 150,
  city: 100,
  zip: 10,
  /** firstName + " " + lastName, so it must fit both plus the separator. */
  customerName: 100,
  /** street + city + zip, composed client-side into one line. */
  address: 300,
} as const;

const checkoutItem = z.object({
  sku: z.string().min(1),
  qty: z.number().int().positive().max(MAX_QTY_PER_LINE),
});

export const checkoutSchema = z.object({
  customerName: z.string().trim().min(1).max(CHECKOUT_FIELD_MAX.customerName),
  customerEmail: z
    .string()
    .trim()
    .max(CHECKOUT_FIELD_MAX.customerEmail)
    // Same permissive pattern as everywhere else — real validation is whether
    // the mail arrives, this just catches typos and junk.
    .regex(EMAIL_RE),
  customerPhone: z.string().trim().max(CHECKOUT_FIELD_MAX.customerPhone).regex(PHONE_RE),
  address: z.string().trim().max(CHECKOUT_FIELD_MAX.address).nullish(),
  paymentMethod: z.enum(PAYMENT_METHOD),
  deliveryMethod: z.enum(DELIVERY_METHOD).default("shipping"),
  items: z.array(checkoutItem).min(1).max(MAX_ITEM_LINES),
  couponCode: z.string().trim().nullish(),
  shippingCouponCode: z.string().trim().nullish(),
  giftSku: z.string().trim().nullish(),
  idempotencyKey: z.string().min(1).nullish(),
})
  // A shipped order needs somewhere to ship to; a pickup deliberately doesn't.
  .refine((data) => data.deliveryMethod !== "shipping" || !!data.address, {
    path: ["address"],
    message: "address_required_for_shipping",
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Maps a schema failure onto the error codes the client already handles.
 * The route answered `invalid_email` / `invalid_phone` / `field_too_long` /
 * `missing_fields` before this, and the checkout page maps those to
 * translated messages — so the codes are kept rather than replaced with
 * zod's own issue format.
 */
export function checkoutErrorCode(error: z.ZodError): string {
  const issue = error.issues[0];
  const field = String(issue?.path[0] ?? "");

  if (field === "customerEmail") return "invalid_email";
  if (field === "customerPhone") return "invalid_phone";
  if (field === "items") return "invalid_items";
  if (field === "paymentMethod") return "invalid_payment_method";
  if (issue?.code === "too_big") return "field_too_long";
  return "missing_fields";
}
