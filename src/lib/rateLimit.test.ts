import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// REDIS_URL is never set in the test env (vitest.setup.ts), so every call
// here exercises the in-memory fallback branch — the Redis branch belongs
// to an integration test with a real/mocked Redis, not a unit test.

describe("rateLimit (in-memory fallback)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit", async () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      expect(await rateLimit(key, 3, 60_000)).toBe(true);
    }
  });

  it("rejects the request once the limit is exceeded", async () => {
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, 3, 60_000);
    }
    expect(await rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test:${crypto.randomUUID()}`;
    const keyB = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) await rateLimit(keyA, 3, 60_000);
    // keyB has never been used, so it should still be fresh regardless of
    // keyA being exhausted.
    expect(await rateLimit(keyB, 3, 60_000)).toBe(true);
  });

  it("resets after the window expires", async () => {
    vi.useFakeTimers();
    const key = `test:${crypto.randomUUID()}`;
    try {
      await rateLimit(key, 1, 1000);
      expect(await rateLimit(key, 1, 1000)).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(await rateLimit(key, 1, 1000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("getClientIp", () => {
  it("takes the first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' when neither header is present", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });
});
