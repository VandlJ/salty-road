import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  restoreStock,
  releaseCouponUse,
  reconsumeCouponUse,
  type TxClient,
} from "@/lib/orderStock";

// Minimal stand-in for the Prisma transaction client — these helpers only
// ever touch merchVariant.updateMany and $executeRaw.
function buildTx(overrides: {
  updateManyCount?: number;
  executeRawResult?: number;
} = {}) {
  const updateMany = vi.fn().mockResolvedValue({ count: overrides.updateManyCount ?? 1 });
  const executeRaw = vi.fn().mockResolvedValue(overrides.executeRawResult ?? 1);
  const tx = {
    merchVariant: { updateMany },
    $executeRaw: executeRaw,
  } as unknown as TxClient;
  return { tx, updateMany, executeRaw };
}

describe("restoreStock", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("increments each item's variant by the ordered quantity", async () => {
    const { tx, updateMany } = buildTx();

    await restoreStock(tx, [{ sku: "hoodie-black-l", qty: 2 }, { sku: "cap-black", qty: 1 }], "test");

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { sku: "hoodie-black-l" },
      data: { quantity: { increment: 2 } },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { sku: "cap-black" },
      data: { quantity: { increment: 1 } },
    });
  });

  it("warns instead of throwing when the variant no longer exists", async () => {
    // Regression: the increment paths used to ignore `count`, so stock held
    // by an order referencing a since-deleted variant vanished silently.
    const { tx } = buildTx({ updateManyCount: 0 });

    await expect(
      restoreStock(tx, [{ sku: "deleted-sku", qty: 3 }], "cancel order 42")
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]?.[0]);
    expect(message).toContain("deleted-sku");
    expect(message).toContain("cancel order 42");
  });

  it("does not warn on the normal path", async () => {
    const { tx } = buildTx({ updateManyCount: 1 });
    await restoreStock(tx, [{ sku: "cap-black", qty: 1 }], "test");
    expect(warn).not.toHaveBeenCalled();
  });

  it("is a no-op for an empty item list", async () => {
    const { tx, updateMany } = buildTx();
    await restoreStock(tx, [], "test");
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("releaseCouponUse", () => {
  it("issues a floored decrement so a double release cannot mint free uses", async () => {
    const { tx, executeRaw } = buildTx();
    await releaseCouponUse(tx, "SALTYVOL1");

    const sql = executeRaw.mock.calls[0]?.[0].join("?");
    expect(sql).toContain(`"usedCount" - 1`);
    expect(sql).toContain(`"usedCount" > 0`);
  });
});

describe("reconsumeCouponUse", () => {
  it("resolves when a use was still available", async () => {
    const { tx } = buildTx({ executeRawResult: 1 });
    await expect(reconsumeCouponUse(tx, "SALTYVOL1")).resolves.toBeUndefined();
  });

  it("throws a 409 when the coupon has meanwhile been exhausted", async () => {
    // The caller relies on this to roll the whole transaction back rather
    // than re-opening an order on a coupon with no uses left. It's an
    // ApiError so withAdmin turns it into a 409 without the route needing
    // its own string-matching catch block.
    const { tx } = buildTx({ executeRawResult: 0 });
    await expect(reconsumeCouponUse(tx, "SALTYVOL1")).rejects.toMatchObject({
      code: "insufficient_coupon",
      status: 409,
    });
  });
});
