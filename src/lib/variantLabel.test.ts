import { describe, it, expect } from "vitest";
import {
  sizeRank,
  compareBySize,
  compareVariantsForDisplay,
  variantLabel,
  SIZE_ORDER,
} from "@/lib/variantLabel";

describe("sizeRank", () => {
  it("ranks null/undefined below every known size", () => {
    expect(sizeRank(null)).toBe(-1);
    expect(sizeRank(undefined)).toBe(-1);
  });

  it("ranks a known size by its position in the ladder", () => {
    expect(sizeRank("S")).toBe(SIZE_ORDER.indexOf("S"));
    expect(sizeRank("XL")).toBe(SIZE_ORDER.indexOf("XL"));
  });

  it("is case-insensitive", () => {
    expect(sizeRank("m")).toBe(sizeRank("M"));
  });

  it("ranks an unknown size after every known size", () => {
    expect(sizeRank("ONE-SIZE")).toBe(1000);
  });
});

describe("compareBySize", () => {
  it("orders known sizes by the fixed ladder, not alphabetically", () => {
    // Alphabetically "L" < "M" < "S" < "XL" — the ladder must win instead.
    const sizes = ["L", "XL", "S", "M"].map((size) => ({ size }));
    sizes.sort(compareBySize);
    expect(sizes.map((s) => s.size)).toEqual(["S", "M", "L", "XL"]);
  });

  it("sorts unknown sizes alphabetically among themselves, after known ones", () => {
    const sizes = ["Z-CUSTOM", "S", "A-CUSTOM"].map((size) => ({ size }));
    sizes.sort(compareBySize);
    expect(sizes.map((s) => s.size)).toEqual(["S", "A-CUSTOM", "Z-CUSTOM"]);
  });

  it("never throws on missing sizes", () => {
    const sizes = [{ size: null }, { size: "M" }, { size: undefined }];
    expect(() => sizes.sort(compareBySize)).not.toThrow();
  });
});

describe("compareVariantsForDisplay", () => {
  it("sorts by color-group order first", () => {
    const variants = [
      { order: 2, size: "S" },
      { order: 1, size: "XL" },
    ];
    variants.sort(compareVariantsForDisplay);
    expect(variants.map((v) => v.order)).toEqual([1, 2]);
  });

  it("sorts by size within the same color group", () => {
    const variants = [
      { order: 1, size: "L" },
      { order: 1, size: "S" },
      { order: 1, size: "M" },
    ];
    variants.sort(compareVariantsForDisplay);
    expect(variants.map((v) => v.size)).toEqual(["S", "M", "L"]);
  });
});

describe("variantLabel", () => {
  it("combines size and color", () => {
    expect(variantLabel({ size: "M", color: "Černá" })).toBe("M / Černá");
  });

  it("falls back to size only", () => {
    expect(variantLabel({ size: "M", color: null })).toBe("M");
  });

  it("falls back to color only", () => {
    expect(variantLabel({ size: null, color: "Černá" })).toBe("Černá");
  });

  it("returns an empty string when neither is set", () => {
    expect(variantLabel({ size: null, color: null })).toBe("");
  });

  it("trims whitespace from both fields", () => {
    expect(variantLabel({ size: " M ", color: " Černá " })).toBe("M / Černá");
  });
});
