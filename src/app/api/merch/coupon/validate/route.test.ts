import { describe, it, expect, vi } from "vitest";

const coupons: Record<string, Record<string, unknown>> = {
  TEST10: { code: "TEST10", type: "percent", value: 10, maxUses: null, usedCount: 0, active: true, expiresAt: null, categories: [] },
  EXPIRED: { code: "EXPIRED", type: "percent", value: 10, maxUses: null, usedCount: 0, active: true, expiresAt: new Date("2020-01-01"), categories: [] },
  MAXEDOUT: { code: "MAXEDOUT", type: "fixed", value: 5000, maxUses: 1, usedCount: 1, active: true, expiresAt: null, categories: [] },
  INACTIVE: { code: "INACTIVE", type: "percent", value: 10, maxUses: null, usedCount: 0, active: false, expiresAt: null, categories: [] },
  CATONLY: { code: "CATONLY", type: "percent", value: 50, maxUses: null, usedCount: 0, active: true, expiresAt: null, categories: ["cap"] },
  TESTSHIP: { code: "TESTSHIP", type: "free_shipping", value: 0, maxUses: null, usedCount: 0, active: true, expiresAt: null, categories: [] },
};

const variants: Record<string, { sku: string; price: number; product: { category: string } }> = {
  "TEST-M": { sku: "TEST-M", price: 65000, product: { category: "hoodie" } },
  "TEST-CAP": { sku: "TEST-CAP", price: 45000, product: { category: "cap" } },
};

const executeRaw = vi.fn().mockResolvedValue(1);

vi.mock("@/lib/prisma", () => ({
  default: {
    coupon: {
      findUnique: vi.fn(({ where: { code } }: { where: { code: string } }) =>
        Promise.resolve(coupons[code] ?? null)
      ),
    },
    merchVariant: {
      findMany: vi.fn(({ where }: { where: { sku: { in: string[] } } }) =>
        Promise.resolve(where.sku.in.map((sku) => variants[sku]).filter(Boolean))
      ),
    },
    $executeRaw: executeRaw,
  },
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: () => "127.0.0.1",
}));

const { POST } = await import("./route");

function postRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/merch/coupon/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const oneItem = [{ sku: "TEST-M", qty: 1 }];

describe("POST /api/merch/coupon/validate", () => {
  it("rejects an expired coupon", async () => {
    const res = await POST(postRequest({ code: "EXPIRED", items: oneItem }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("invalid_coupon");
  });

  it("rejects a coupon that hit its use limit", async () => {
    const res = await POST(postRequest({ code: "MAXEDOUT", items: oneItem }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("invalid_coupon");
  });

  it("rejects an inactive coupon", async () => {
    const res = await POST(postRequest({ code: "INACTIVE", items: oneItem }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("invalid_coupon");
  });

  it("rejects a category-restricted coupon against a non-matching cart", async () => {
    const res = await POST(postRequest({ code: "CATONLY", items: oneItem }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("coupon_not_applicable");
  });

  it("accepts a category-restricted coupon against a matching cart", async () => {
    const res = await POST(postRequest({ code: "CATONLY", items: [{ sku: "TEST-CAP", qty: 1 }] }));
    expect(res.status).toBe(200);
    expect((await res.json()).discountAmount).toBe(22500); // 50% of 45000
  });

  it("returns freeShipping:true and no discount for a free_shipping coupon", async () => {
    const res = await POST(postRequest({ code: "TESTSHIP", items: oneItem }));
    const json = await res.json();
    expect(json.freeShipping).toBe(true);
    expect(json.discountAmount).toBe(0);
  });

  it("never increments usedCount — this is a preview, not a consumption", async () => {
    await POST(postRequest({ code: "TEST10", items: oneItem }));
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("rejects a malformed request body", async () => {
    const res = await POST(postRequest({ code: "TEST10", items: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_request");
  });
});
