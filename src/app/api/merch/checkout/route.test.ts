import { describe, it, expect, vi } from "vitest";

// The route module imports "@/lib/prisma" (constructs a real PrismaClient at
// module load) both directly and transitively via "@/lib/shipping" — these
// tests only exercise the validation cascade that returns before any DB
// call, so a minimal mock is enough to keep the import itself DB-free.
vi.mock("@/lib/prisma", () => ({
  default: {
    merchVariant: { findMany: vi.fn(), findUnique: vi.fn() },
    setting: { findUnique: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// Rate limiting is covered separately (src/lib/rateLimit.test.ts) — always
// allow here so it can't interfere with a validation-only test.
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: () => "127.0.0.1",
}));

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

describe("POST /api/merch/checkout — validation cascade", () => {
  it("rejects a request missing required fields", async () => {
    const res = await POST(postRequest({ ...validBase, customerName: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_fields");
  });

  it("rejects a non-string customerName instead of crashing into Prisma", async () => {
    // Regression: this used to skip the MAX_LEN guard entirely (only string
    // values were length-checked) and surface as an opaque 500 from Prisma.
    const res = await POST(postRequest({ ...validBase, customerName: ["a", "b"] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_fields");
  });

  it("rejects an invalid email", async () => {
    const res = await POST(postRequest({ ...validBase, customerEmail: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_email");
  });

  it("rejects a phone number outside the allowed format", async () => {
    const res = await POST(postRequest({ ...validBase, customerPhone: "abc" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_phone");
  });

  it("rejects a field longer than its max length", async () => {
    const res = await POST(postRequest({ ...validBase, customerName: "x".repeat(101) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("field_too_long");
  });

  it("rejects a payment method other than bank_transfer", async () => {
    const res = await POST(postRequest({ ...validBase, paymentMethod: "cod" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_payment_method");
  });

  it("rejects an empty items array", async () => {
    const res = await POST(postRequest({ ...validBase, items: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });

  it("rejects more than the max number of item lines", async () => {
    const items = Array.from({ length: 21 }, (_, i) => ({ sku: `SKU-${i}`, qty: 1 }));
    const res = await POST(postRequest({ ...validBase, items }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });

  it("rejects a zero quantity", async () => {
    const res = await POST(postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 0 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });

  it("rejects a quantity above the per-line max", async () => {
    const res = await POST(postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 21 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });

  it("rejects a non-integer quantity", async () => {
    const res = await POST(postRequest({ ...validBase, items: [{ sku: "TEST-M", qty: 1.5 }] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });

  it("requires an address for shipping delivery", async () => {
    const res = await POST(postRequest({ ...validBase, deliveryMethod: "shipping", address: undefined }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_fields");
  });

  it("does not require an address for pickup delivery", async () => {
    // Send an otherwise-invalid request (empty items) so the response
    // proves the address check was skipped rather than never reached —
    // if address were still required, this would 400 as missing_fields
    // instead of invalid_items.
    const res = await POST(
      postRequest({ ...validBase, deliveryMethod: "pickup", address: undefined, items: [] })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_items");
  });
});
