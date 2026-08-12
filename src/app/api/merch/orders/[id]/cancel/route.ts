import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrderVs } from "@/lib/orderVs";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

// Customer-facing self-service cancellation — no login needed, but the
// caller has to prove they own the order by also knowing its VS (shown
// only to the buyer on the thank-you page and in their confirmation
// email), the same two-factor pattern the QR payment message already
// relies on. Only "pending" orders can be cancelled this way; once an
// order is paid/shipped, cancellation needs a real refund and goes
// through the shop admin instead.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function releaseCouponUse(tx: TxClient, code: string) {
  await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" - 1
    WHERE code = ${code} AND "usedCount" > 0
  `;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimit(`order-cancel:${getClientIp(req)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const { id } = await params;
    const { vs } = await req.json();
    if (typeof vs !== "string" || !vs) {
      return NextResponse.json({ error: "missing_vs" }, { status: 400 });
    }

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");
      if (getOrderVs(current.createdAt, current.orderNumber) !== vs) throw new Error("NOT_FOUND");
      if (current.status !== "pending") throw new Error("NOT_CANCELLABLE");

      const items = current.items as { sku: string; qty: number }[];
      for (const item of items) {
        await tx.merchVariant.updateMany({
          where: { sku: item.sku },
          data: { quantity: { increment: item.qty } },
        });
      }
      if (current.couponCode) await releaseCouponUse(tx, current.couponCode);
      if (current.shippingCouponCode) await releaseCouponUse(tx, current.shippingCouponCode);

      return tx.order.update({ where: { id }, data: { status: "cancelled" } });
    });

    return NextResponse.json({ status: order.status });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "NOT_CANCELLABLE") {
      return NextResponse.json({ error: "not_cancellable" }, { status: 409 });
    }
    console.error("POST /api/merch/orders/[id]/cancel error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
