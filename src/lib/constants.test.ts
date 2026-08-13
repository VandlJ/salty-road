import { describe, it, expect } from "vitest";
import {
  isOneOf,
  ORDER_STATUS,
  PAYMENT_STATUS,
  REGISTRATION_STATUS,
  EMAIL_RE,
  PHONE_RE,
} from "@/lib/constants";

describe("isOneOf", () => {
  it("accepts a member of the set", () => {
    expect(isOneOf(ORDER_STATUS, "shipped")).toBe(true);
    expect(isOneOf(PAYMENT_STATUS, "paid")).toBe(true);
    expect(isOneOf(REGISTRATION_STATUS, "declined")).toBe(true);
  });

  it("rejects a non-member string", () => {
    // Regression: updatePaymentStatus used to write body.paymentStatus
    // straight to the DB, so any string at all became a stored status.
    expect(isOneOf(PAYMENT_STATUS, "definitely-not-a-status")).toBe(false);
    expect(isOneOf(ORDER_STATUS, "refunded")).toBe(false);
  });

  it("is case-sensitive — the DB stores these values verbatim", () => {
    expect(isOneOf(ORDER_STATUS, "Paid")).toBe(false);
  });

  it("rejects non-string input", () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      expect(isOneOf(ORDER_STATUS, value)).toBe(false);
    }
  });
});

describe("EMAIL_RE", () => {
  it("accepts ordinary addresses", () => {
    for (const email of ["a@b.cz", "jan.novak@example.co.uk", "x+tag@mail.example.com"]) {
      expect(EMAIL_RE.test(email)).toBe(true);
    }
  });

  it("rejects obvious junk", () => {
    for (const email of ["", "no-at-sign", "@example.cz", "a@b", "a b@example.cz", "a@ b.cz"]) {
      expect(EMAIL_RE.test(email)).toBe(false);
    }
  });
});

describe("PHONE_RE", () => {
  it("accepts the separators people actually type", () => {
    for (const phone of ["+420 777 123 456", "777123456", "(420) 777-123-456"]) {
      expect(PHONE_RE.test(phone)).toBe(true);
    }
  });

  it("rejects letters and out-of-range lengths", () => {
    expect(PHONE_RE.test("abc")).toBe(false);
    expect(PHONE_RE.test("12345")).toBe(false);
    expect(PHONE_RE.test("1".repeat(25))).toBe(false);
  });
});
