import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException }));

const { logError } = await import("@/lib/logError");

let error: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  captureException.mockClear();
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => error.mockRestore());

describe("logError", () => {
  it("still logs to the console, so an unconfigured environment loses nothing", () => {
    const err = new Error("resend is down");
    logError("email:resend-send", err, { subject: "Potvrzení objednávky" });

    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("email:resend-send");
  });

  it("reports to Sentry tagged with the scope", () => {
    const err = new Error("resend is down");
    logError("email:resend-send", err, { orderNumber: 17 });

    expect(captureException).toHaveBeenCalledWith(err, {
      tags: { scope: "email:resend-send" },
      extra: { orderNumber: 17 },
    });
  });

  it("works without context", () => {
    expect(() => logError("scope", new Error("x"))).not.toThrow();
    expect(captureException).toHaveBeenCalledWith(new Error("x"), {
      tags: { scope: "scope" },
      extra: undefined,
    });
  });

  it("does not throw on a non-Error value", () => {
    expect(() => logError("scope", "just a string")).not.toThrow();
  });
});
