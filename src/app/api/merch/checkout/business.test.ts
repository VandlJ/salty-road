import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// Business-logic invariants for the checkout route, exercised against a
// mocked Prisma client (no real DB) — the validation cascade that returns
// before touching Prisma is covered separately in route.test.ts.

const variantMap: Record<string, { sku: string; price: number; active: boolean; product: { id: string; name: string; category: string; active: boolean; giftEligible: boolean } }> = {
  "TEST-M": {
    sku: "TEST-M",
    price: 65000,
    active: true,
    product: { id: "prod-1", name: "Test Hoodie", category: "hoodie", active: true, giftEligible: false },
  },
  "TEST-STICKER": {
    sku: "TEST-STICKER",
    price: 5000,
    active: true,
    product: { id: "prod-2", name: "Test Sticker", category: "sticker", active: true, giftEligible: true },
  },
};

const coupons: Record<string, { code: string; type: string; value: number; categories: string[] }> = {
  TEST10: { code: "TEST10", type: "percent", value: 10, categories: [] },
  TESTFIX: { code: "TESTFIX", type: "fixed", value: 10000, categories: [] },
  TESTSHIP: { code: "TESTSHIP", type: "free_shipping", value: 0, categories: [] },
  TESTCAT: { code: "TESTCAT", type: "percent", value: 50, categories: ["cap"] }, // no matching cart item
};

let orderFindUnique: ReturnType<typeof vi.fn>;
let orderCreate: ReturnType<typeof vi.fn>;
let outerOrderFindUnique: ReturnType<typeof vi.fn>;
let merchVariantUpdateMany: ReturnType<typeof vi.fn>;
let merchVariantFindUnique: ReturnType<typeof vi.fn>;
let settingFindUnique: ReturnType<typeof vi.fn>;
let executeRaw: ReturnType<typeof vi.fn>;

function buildTx() {
  return {
    order: { findUnique: orderFindUnique, create: orderCreate },
    merchVariant: { updateMany: merchVariantUpdateMany, findUnique: merchVariantFindUnique },
    setting: { findUnique: settingFindUnique },
    coupon: {
      findUniqueOrThrow: vi.fn(({ where: { code } }: { where: { code: string } }) => {
        const coupon = coupons[code];
        if (!coupon) throw new Error("not found");
        return Promise.resolve({ ...coupon, id: code, usedCount: 0, maxUses: null, active: true, expiresAt: null });
      }),
      // Used to peek each submitted code's type before consuming it (see
      // the B4 fix in route.ts) — unknown codes just resolve to an empty
      // array, matching a real DB miss.
      findMany: vi.fn(({ where: { code } }: { where: { code: { in: string[] } } }) =>
        Promise.resolve(
          code.in.filter((c) => coupons[c]).map((c) => ({ code: c, type: coupons[c].type }))
        )
      ),
    },
    $executeRaw: executeRaw,
  };
}

vi.mock("@/lib/prisma", () => ({
  default: {
    merchVariant: {
      findMany: vi.fn(({ where }: { where: { sku: { in: string[] } } }) =>
        Promise.resolve(where.sku.in.map((sku) => variantMap[sku]).filter(Boolean))
      ),
    },
    // Outer (non-transactional) order.findUnique — used only by the P2002
    // race fallback in the catch block, separate from tx.order.findUnique
    // (the idempotency check inside the transaction).
    order: {
      findUnique: (...args: unknown[]) =>
        (outerOrderFindUnique as (...a: unknown[]) => unknown)(...args),
    },
    $transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(buildTx())),
  },
}));

vi.mock("@/lib/shipping", () => ({
  getShippingFee: vi.fn().mockResolvedValue(9900),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/email", () => ({
  sendMerchOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEmail: vi.fn().mockResolvedValue(undefined),
  SHOP_EMAIL_FROM: "Salty Road Shop <shop@saltyroad.cz>",
}));

// after() normally defers to post-response, backed by an AsyncLocalStorage
// request context that doesn't exist in a unit test — run the callback
// immediately (fire-and-forget, matching real behaviour of not blocking the
// response) instead of letting it throw for lack of that context.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void fn() };
});

const { POST } = await import("./route");

function postRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/merch/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBase = {
  customerName: "Jan Novák",
  customerEmail: "jan@example.com",
  customerPhone: "+420 111222333",
  address: "Testovací 1, 12345 Praha",
  paymentMethod: "bank_transfer",
  deliveryMethod: "shipping",
  items: [{ sku: "TEST-M", qty: 1 }],
};

beforeEach(() => {
  orderFindUnique = vi.fn().mockResolvedValue(null);
  orderCreate = vi.fn((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "order-1", createdAt: new Date("2026-08-02"), orderNumber: 1, ...args.data })
  );
  merchVariantUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  merchVariantFindUnique = vi.fn().mockResolvedValue(null);
  settingFindUnique = vi.fn().mockResolvedValue(null);
  executeRaw = vi.fn().mockResolvedValue(1);
  outerOrderFindUnique = vi.fn().mockResolvedValue(null);
});

describe("POST /api/merch/checkout — business logic", () => {
  it("prices strictly from the DB variant, ignoring anything client-submitted", async () => {
    // The request body's item shape only carries sku+qty (see CheckoutItemInput),
    // so there's no client price field to smuggle in the first place — this
    // asserts the resulting total matches the mocked DB price exactly.
    const res = await POST(postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 2 }] }));
    expect(res.status).toBe(201);
    const json = await res.json();
    // 2 x 65000 + 9900 shipping
    expect(json.totalAmount).toBe(2 * 65000 + 9900);
  });

  it("returns the existing order on a repeated idempotency key without decrementing stock again", async () => {
    orderFindUnique.mockResolvedValue({
      id: "order-existing",
      createdAt: new Date("2026-08-02"),
      orderNumber: 1,
      items: [],
      totalAmount: 65000,
      paymentMethod: "bank_transfer",
      deliveryMethod: "shipping",
      shippingFee: 9900,
      couponCode: null,
      discountAmount: 0,
      shippingCouponCode: null,
      giftLabel: null,
      address: validBase.address,
    });

    const res = await POST(postRequest({ ...validBase, idempotencyKey: "dup-key" }));
    expect(res.status).toBe(201);
    expect((await res.json()).orderId).toBe("order-existing");
    expect(merchVariantUpdateMany).not.toHaveBeenCalled();
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("decrements stock via an atomic conditional update", async () => {
    await POST(postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 3 }] }));
    expect(merchVariantUpdateMany).toHaveBeenCalledWith({
      where: { sku: "TEST-M", quantity: { gte: 3 } },
      data: { quantity: { decrement: 3 } },
    });
  });

  it("returns 409 insufficient_stock and never creates the order when stock runs out", async () => {
    merchVariantUpdateMany.mockResolvedValue({ count: 0 });
    const res = await POST(postRequest(validBase));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("insufficient_stock");
    expect(orderCreate).not.toHaveBeenCalled();
  });

  it("applies a percent coupon rounded to the nearest halire", async () => {
    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], couponCode: "TEST10" })
    );
    const json = await res.json();
    expect(json.discountAmount).toBe(6500); // 10% of 65000
    expect(json.couponCode).toBe("TEST10");
  });

  it("applies a fixed coupon capped at the eligible subtotal, never going negative", async () => {
    // TESTFIX is 10000 halire fixed off a single unit that only costs 65000
    // — well under the subtotal here, so it's just a plain subtraction, but
    // this is the same clamp path a coupon bigger than the cart would hit.
    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], couponCode: "TESTFIX" })
    );
    const json = await res.json();
    expect(json.discountAmount).toBe(10000);
  });

  it("only discounts the category-eligible slice of the cart", async () => {
    // TESTCAT is restricted to "cap", cart only has a "hoodie" — eligible
    // subtotal is 0, so the coupon is rejected as invalid rather than
    // silently discounting the wrong items.
    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], couponCode: "TESTCAT" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_coupon");
  });

  it("rejects two discount-type codes without consuming either", async () => {
    // TEST10 and TESTFIX both land in the discount slot via the couponCode/
    // shippingCouponCode fields — must be rejected before either coupon's
    // usedCount is touched, otherwise a maxUses:1 coupon gets burned for
    // an order that never applied it.
    const res = await POST(
      postRequest({
        ...validBase,
        items: [{ sku: "TEST-M", qty: 1 }],
        couponCode: "TEST10",
        shippingCouponCode: "TESTFIX",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_coupon");
    expect(executeRaw).not.toHaveBeenCalled();
  });

  it("a free_shipping coupon zeroes the shipping fee without discounting items", async () => {
    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], shippingCouponCode: "TESTSHIP" })
    );
    const json = await res.json();
    expect(json.discountAmount).toBe(0);
    expect(json.shippingFee).toBe(0);
    expect(json.shippingCouponCode).toBe("TESTSHIP");
    expect(json.totalAmount).toBe(65000);
  });

  it("combines an independent discount coupon and shipping coupon on the same order", async () => {
    const res = await POST(
      postRequest({
        ...validBase,
        items: [{ sku: "TEST-M", qty: 1 }],
        couponCode: "TEST10",
        shippingCouponCode: "TESTSHIP",
      })
    );
    const json = await res.json();
    expect(json.discountAmount).toBe(6500);
    expect(json.shippingFee).toBe(0);
    expect(json.couponCode).toBe("TEST10");
    expect(json.shippingCouponCode).toBe("TESTSHIP");
    expect(json.totalAmount).toBe(65000 - 6500);
  });

  it("charges no shipping fee for pickup delivery", async () => {
    const res = await POST(
      postRequest({ ...validBase, deliveryMethod: "pickup", address: undefined })
    );
    expect((await res.json()).shippingFee).toBe(0);
  });

  it("drops a gift silently when the cart is below the threshold, order still succeeds", async () => {
    settingFindUnique.mockImplementation(({ where: { key } }: { where: { key: string } }) =>
      Promise.resolve(key === "sticker_gift_threshold_halire" ? { key, value: "150000" } : null)
    );
    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], giftSku: "TEST-STICKER" })
    );
    expect(res.status).toBe(201);
    expect((await res.json()).giftLabel).toBeNull();
    expect(merchVariantFindUnique).not.toHaveBeenCalled();
  });

  it("drops a sold-out gift silently instead of failing the order", async () => {
    settingFindUnique.mockImplementation(({ where: { key } }: { where: { key: string } }) =>
      Promise.resolve(key === "sticker_gift_threshold_halire" ? { key, value: "1" } : null)
    );
    merchVariantFindUnique.mockResolvedValue(variantMap["TEST-STICKER"]);
    // First updateMany call is the paid item's stock decrement (succeeds),
    // the second is the gift's decrement — make only that one fail.
    merchVariantUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], giftSku: "TEST-STICKER" })
    );
    expect(res.status).toBe(201);
    expect((await res.json()).giftLabel).toBeNull();
  });

  it("attaches a valid gift when the cart clears the threshold", async () => {
    settingFindUnique.mockImplementation(({ where: { key } }: { where: { key: string } }) =>
      Promise.resolve(key === "sticker_gift_threshold_halire" ? { key, value: "1" } : null)
    );
    merchVariantFindUnique.mockResolvedValue(variantMap["TEST-STICKER"]);

    const res = await POST(
      postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1 }], giftSku: "TEST-STICKER" })
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.giftLabel).toBe("Test Sticker");
  });

  it("returns 201 even though email sending is deferred and out of the critical path", async () => {
    const res = await POST(postRequest(validBase));
    expect(res.status).toBe(201);
  });

  it("returns the winning order (not a 500) when a concurrent retry loses the idempotency-key race", async () => {
    // Two truly concurrent requests with the same key can both pass the
    // in-transaction findUnique check before either commits — the loser's
    // tx.order.create() hits the unique constraint here instead.
    orderCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );
    outerOrderFindUnique.mockResolvedValue({
      id: "order-winner",
      createdAt: new Date("2026-08-02"),
      orderNumber: 1,
      totalAmount: 65000,
      paymentMethod: "bank_transfer",
      deliveryMethod: "shipping",
      shippingFee: 9900,
      couponCode: null,
      discountAmount: 0,
      shippingCouponCode: null,
      giftLabel: null,
    });

    const res = await POST(postRequest({ ...validBase, idempotencyKey: "race-key" }));
    expect(res.status).toBe(201);
    expect((await res.json()).orderId).toBe("order-winner");
  });
});
