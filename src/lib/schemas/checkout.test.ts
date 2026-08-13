import { describe, it, expect } from "vitest";
import { checkoutSchema, checkoutErrorCode, CHECKOUT_FIELD_MAX } from "@/lib/schemas/checkout";

const valid = {
  customerName: "Jan Novák",
  customerEmail: "jan@example.cz",
  customerPhone: "+420 777 123 456",
  address: "Ukázková 1, 301 00 Plzeň",
  paymentMethod: "bank_transfer",
  deliveryMethod: "shipping",
  items: [{ sku: "hoodie-black-l", qty: 1 }],
};

const parse = (over: Record<string, unknown> = {}) =>
  checkoutSchema.safeParse({ ...valid, ...over });

describe("checkoutSchema", () => {
  it("accepts a well-formed order", () => {
    expect(parse().success).toBe(true);
  });

  it("defaults deliveryMethod to shipping", () => {
    const r = checkoutSchema.safeParse({ ...valid, deliveryMethod: undefined });
    expect(r.success && r.data.deliveryMethod).toBe("shipping");
  });

  it("requires an address for a shipped order but not for pickup", () => {
    expect(parse({ address: null }).success).toBe(false);
    expect(parse({ deliveryMethod: "pickup", address: null }).success).toBe(true);
  });

  it("rejects a non-string where a string is required", () => {
    // The hand-rolled cascade this replaced let a non-string past the length
    // guard, which then surfaced as an opaque 500 from Prisma rather than a 400.
    expect(parse({ customerName: 42 }).success).toBe(false);
    expect(parse({ customerEmail: { evil: true } }).success).toBe(false);
  });

  it("rejects an empty cart and an over-long one", () => {
    expect(parse({ items: [] }).success).toBe(false);
    expect(parse({ items: Array(21).fill({ sku: "x", qty: 1 }) }).success).toBe(false);
  });

  it("rejects a non-positive or fractional quantity", () => {
    for (const qty of [0, -1, 1.5]) {
      expect(parse({ items: [{ sku: "x", qty }] }).success).toBe(false);
    }
  });

  it("caps quantity per line", () => {
    expect(parse({ items: [{ sku: "x", qty: 21 }] }).success).toBe(false);
  });

  it("enforces the field lengths the form also uses", () => {
    expect(parse({ customerName: "x".repeat(CHECKOUT_FIELD_MAX.customerName + 1) }).success).toBe(false);
    expect(parse({ address: "x".repeat(CHECKOUT_FIELD_MAX.address + 1) }).success).toBe(false);
  });

  it("leaves room for the longest name the form can produce", () => {
    // The form collects first and last name separately and joins them, so the
    // server cap has to fit both plus the space.
    const longest = "a".repeat(CHECKOUT_FIELD_MAX.firstName) + " " + "b".repeat(CHECKOUT_FIELD_MAX.lastName);
    expect(longest.length).toBeLessThanOrEqual(CHECKOUT_FIELD_MAX.customerName);
    expect(parse({ customerName: longest }).success).toBe(true);
  });

  it("rejects junk emails and phone numbers", () => {
    expect(parse({ customerEmail: "not-an-email" }).success).toBe(false);
    expect(parse({ customerPhone: "abc" }).success).toBe(false);
  });

  it("rejects an unknown payment or delivery method", () => {
    expect(parse({ paymentMethod: "crypto" }).success).toBe(false);
    expect(parse({ deliveryMethod: "teleport" }).success).toBe(false);
  });
});

describe("checkoutErrorCode", () => {
  const codeFor = (over: Record<string, unknown>) => {
    const r = parse(over);
    if (r.success) throw new Error("expected a failure");
    return checkoutErrorCode(r.error);
  };

  it("maps failures onto the codes the checkout page already translates", () => {
    expect(codeFor({ customerEmail: "nope" })).toBe("invalid_email");
    expect(codeFor({ customerPhone: "nope" })).toBe("invalid_phone");
    expect(codeFor({ items: [] })).toBe("invalid_items");
    expect(codeFor({ paymentMethod: "crypto" })).toBe("invalid_payment_method");
    expect(codeFor({ customerName: "x".repeat(200) })).toBe("field_too_long");
    expect(codeFor({ customerName: undefined })).toBe("missing_fields");
  });
});
