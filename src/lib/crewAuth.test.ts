import { describe, it, expect } from "vitest";
import { createCrewToken, verifyCrewToken, verifyPin } from "@/lib/crewAuth";

describe("crew token", () => {
  it("verifies a freshly created token", () => {
    const token = createCrewToken();
    expect(verifyCrewToken(token)).toBe(true);
  });

  it("rejects a token with a tampered signature", () => {
    const token = createCrewToken();
    const [payload] = token.split(".");
    expect(verifyCrewToken(`${payload}.deadbeef`)).toBe(false);
  });

  it("rejects an expired token", () => {
    const expiredPayload = String(Date.now() - 1000);
    // Can't forge a valid signature without the secret, but an expired
    // payload must be rejected before signature verification even runs.
    expect(verifyCrewToken(`${expiredPayload}.anything`)).toBe(false);
  });

  it("rejects malformed tokens without throwing", () => {
    expect(verifyCrewToken(undefined)).toBe(false);
    expect(verifyCrewToken(null)).toBe(false);
    expect(verifyCrewToken("")).toBe(false);
    expect(verifyCrewToken("no-dot-here")).toBe(false);
    expect(verifyCrewToken(".")).toBe(false);
  });
});

describe("verifyPin", () => {
  it("accepts the configured PIN", () => {
    expect(verifyPin("1234")).toBe(true);
  });

  it("rejects a wrong PIN", () => {
    expect(verifyPin("0000")).toBe(false);
  });

  it("rejects an empty PIN", () => {
    expect(verifyPin("")).toBe(false);
  });
});
