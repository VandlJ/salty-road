import prisma from "@/lib/prisma";

// Inferred from prisma.$transaction rather than Prisma.TransactionClient —
// the extended client (see @/lib/prisma) doesn't structurally match that
// stock type once extensions are applied. Same reasoning as the checkout
// route, which declared this inline before it moved here.
export type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// The slice of an Order's `items` JSON blob that stock movements care about.
// A type alias rather than an interface on purpose: only aliases get the
// implicit index signature that lets Prisma's JsonValue be cast to them.
export type OrderStockItem = {
  sku: string;
  qty: number;
};

// Giving stock back when an order is cancelled or deleted. Unlike the
// decrement paths this is unconditional — the point is to restore what the
// order was holding, and there's no "not enough" case to guard against.
//
// It does still check `count`, because a zero here is a real (if rare)
// event: the variant was deleted while the order referenced it (product
// delete cascades, see schema.prisma), so the units it held are now
// unaccounted for. Deliberately logged rather than thrown — an admin must
// still be able to cancel an order containing a discontinued product.
export async function restoreStock(tx: TxClient, items: OrderStockItem[], context: string) {
  for (const item of items) {
    const result = await tx.merchVariant.updateMany({
      where: { sku: item.sku },
      data: { quantity: { increment: item.qty } },
    });
    if (result.count === 0) {
      console.warn(
        `${context}: could not restore ${item.qty}x stock for sku "${item.sku}" — variant no longer exists.`
      );
    }
  }
}

// Cancelling an order should give a coupon use back, so a maxUses-limited
// code isn't permanently burned by an order that never happened. Floors at
// zero so a double release can't mint free uses.
export async function releaseCouponUse(tx: TxClient, code: string) {
  await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" - 1
    WHERE code = ${code} AND "usedCount" > 0
  `;
}

// The inverse, for un-cancelling. Throws if the coupon has meanwhile been
// exhausted by someone else — the caller rolls the whole transaction back
// rather than letting an order re-open on a coupon that no longer has a
// use available.
export async function reconsumeCouponUse(tx: TxClient, code: string) {
  const affected = await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
    WHERE code = ${code} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;
  if (affected === 0) throw new Error("INSUFFICIENT_COUPON");
}
