import { describe, it, expect } from "vitest";
import { tokenExpired } from "@/lib/adminTokenEdge";

describe("tokenExpired", () => {
  it("is false for a token expiring in the future", () => {
    const token = `some-uuid:${Date.now() + 60_000}`;
    expect(tokenExpired(token)).toBe(false);
  });

  it("is true for a token that already expired", () => {
    const token = `some-uuid:${Date.now() - 1}`;
    expect(tokenExpired(token)).toBe(true);
  });

  it("is true for a malformed token with no expiry segment", () => {
    expect(tokenExpired("just-a-uuid-no-colon")).toBe(true);
  });

  it("is true for a non-numeric expiry", () => {
    expect(tokenExpired("some-uuid:not-a-number")).toBe(true);
  });
});
