import { describe, it, expect } from "vitest";
import { formatPrice } from "@/lib/formatPrice";

describe("formatPrice", () => {
  it("converts halire to Kč with a thousands separator", () => {
    // cs-CZ's Intl thousands separator is U+00A0 (non-breaking space), not
    // a regular space — asserting the literal keeps a future locale/ICU
    // change from silently breaking prices without a test catching it.
    expect(formatPrice(145000)).toBe("1 450 Kč");
  });

  it("formats an amount under 1000 without a separator", () => {
    expect(formatPrice(65000)).toBe("650 Kč");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0 Kč");
  });

  it("does not show decimals for whole-crown amounts", () => {
    expect(formatPrice(100)).toBe("1 Kč");
  });
});
