import { describe, it, expect } from "vitest";
import { getOrderVs } from "@/lib/orderVs";

describe("getOrderVs", () => {
  it("derives YY MM DD + zero-padded order number", () => {
    expect(getOrderVs(new Date("2026-07-30"), 3)).toBe("2607300003");
  });

  it("pads a single-digit month and day", () => {
    expect(getOrderVs(new Date("2026-01-05"), 1)).toBe("2601050001");
  });

  it("accepts a date string, not just a Date object", () => {
    expect(getOrderVs("2026-07-30T10:00:00.000Z", 3)).toBe("2607300003");
  });

  it("does not truncate order numbers with more than 4 digits", () => {
    expect(getOrderVs(new Date("2026-07-30"), 12345)).toBe("260730" + "12345");
  });

  it("only ever contains digits", () => {
    const vs = getOrderVs(new Date("2026-12-31"), 42);
    expect(vs).toMatch(/^\d+$/);
  });
});
