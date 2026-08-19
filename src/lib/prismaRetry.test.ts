import { describe, it, expect, vi } from "vitest";
import { isTransientAccelerateError, retryTransient, RETRYABLE_OPERATIONS } from "@/lib/prismaRetry";

// This module exists for one production incident: prisma.edition.findFirst()
// failing with a P5000 wrapping Accelerate's own P6008 ("was not able to
// connect to your database") took the homepage down until the glitch
// cleared, because nothing retried. These tests pin both halves of the fix:
// the error is recognised correctly, and only that error is retried.

const accelerateOutage = {
  code: "P5000",
  message:
    'Invalid `prisma.edition.findFirst()` invocation: This request could not be understood by the server: {"type":"UnknownJsonError","body":{"code":"P6008","message":"Accelerate was not able to connect to your database. The underlying error is: error code: 1016"}}',
};

describe("isTransientAccelerateError", () => {
  it("recognises the exact production incident", () => {
    expect(isTransientAccelerateError(accelerateOutage)).toBe(true);
  });

  it("recognises Accelerate's other connectivity/timeout codes", () => {
    expect(isTransientAccelerateError({ code: "P5000", message: "...P5010..." })).toBe(true);
    expect(isTransientAccelerateError({ code: "P5000", message: "...P5009..." })).toBe(true);
  });

  it("does not retry an ordinary database error", () => {
    // A unique-constraint violation fails identically on a second attempt —
    // retrying it would just be a slower way to return the same rejection.
    expect(isTransientAccelerateError({ code: "P2002", message: "Unique constraint failed" })).toBe(
      false
    );
  });

  it("does not retry a P5000 that isn't a connectivity failure", () => {
    // P5000 is Accelerate's generic "could not understand the request"
    // wrapper; without the specific inner code this could be a malformed
    // query, which will fail the same way every time.
    expect(isTransientAccelerateError({ code: "P5000", message: "totally different problem" })).toBe(
      false
    );
  });

  it("survives non-Prisma-shaped input", () => {
    expect(isTransientAccelerateError(null)).toBe(false);
    expect(isTransientAccelerateError(undefined)).toBe(false);
    expect(isTransientAccelerateError("a plain string")).toBe(false);
    expect(isTransientAccelerateError(new Error("boom"))).toBe(false);
  });
});

describe("retryTransient", () => {
  it("returns the result on first success without waiting", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(retryTransient(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries a transient failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(accelerateOutage)
      .mockResolvedValueOnce("recovered");
    await expect(retryTransient(fn)).resolves.toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries and throws the last error", async () => {
    const fn = vi.fn().mockRejectedValue(accelerateOutage);
    await expect(retryTransient(fn)).rejects.toBe(accelerateOutage);
    // One initial attempt plus the retry budget — proves it does not retry
    // forever against a sustained outage.
    expect(fn.mock.calls.length).toBeGreaterThan(1);
    expect(fn.mock.calls.length).toBeLessThan(10);
  });

  it("propagates a non-retryable error immediately, without delay", async () => {
    const notFound = { code: "P2025", message: "Record not found" };
    const fn = vi.fn().mockRejectedValue(notFound);
    await expect(retryTransient(fn)).rejects.toBe(notFound);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("honours a custom retryability predicate", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("custom")).mockResolvedValueOnce("ok");
    await expect(retryTransient(fn, (e) => e instanceof Error && e.message === "custom")).resolves.toBe(
      "ok"
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("RETRYABLE_OPERATIONS", () => {
  it("includes the read operation from the production incident", () => {
    expect(RETRYABLE_OPERATIONS.has("findFirst")).toBe(true);
    expect(RETRYABLE_OPERATIONS.has("findUnique")).toBe(true);
  });

  it("excludes writes — retrying a create/update risks a duplicate side effect", () => {
    expect(RETRYABLE_OPERATIONS.has("create")).toBe(false);
    expect(RETRYABLE_OPERATIONS.has("update")).toBe(false);
    expect(RETRYABLE_OPERATIONS.has("delete")).toBe(false);
    expect(RETRYABLE_OPERATIONS.has("upsert")).toBe(false);
    expect(RETRYABLE_OPERATIONS.has("$executeRaw")).toBe(false);
  });
});
