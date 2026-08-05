import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { generateInvoicePdf } from "@/lib/invoice";
import { getOrderVs } from "@/lib/orderVs";

const VALID_STATUSES = new Set(["pending", "paid", "shipped", "cancelled"]);

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Mirrors the stock release/re-reserve above, for a coupon's usedCount —
// cancelling an order should give the use back (so a maxUses-limited code
// isn't permanently burned by an order that never happened), un-cancelling
// should re-consume it.
async function releaseCouponUse(tx: TxClient, code: string) {
  await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" - 1
    WHERE code = ${code} AND "usedCount" > 0
  `;
}

async function reconsumeCouponUse(tx: TxClient, code: string) {
  const affected = await tx.$executeRaw`
    UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
    WHERE code = ${code} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
  `;
  if (affected === 0) throw new Error("INSUFFICIENT_COUPON");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    let newlyPaid = false;

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");

      newlyPaid = status === "paid" && current.status !== "paid";

      const items = current.items as { sku: string; qty: number }[];

      if (status === "cancelled" && current.status !== "cancelled") {
        // Order is being cancelled — release the stock it was holding.
        for (const item of items) {
          await tx.merchVariant.updateMany({
            where: { sku: item.sku },
            data: { quantity: { increment: item.qty } },
          });
        }
        if (current.couponCode) await releaseCouponUse(tx, current.couponCode);
        if (current.shippingCouponCode) await releaseCouponUse(tx, current.shippingCouponCode);
      } else if (status !== "cancelled" && current.status === "cancelled") {
        // Order is being un-cancelled — re-reserve the stock. Same atomic
        // conditional decrement as checkout, so it can't go negative if
        // stock was sold elsewhere in the meantime.
        for (const item of items) {
          const result = await tx.merchVariant.updateMany({
            where: { sku: item.sku, quantity: { gte: item.qty } },
            data: { quantity: { decrement: item.qty } },
          });
          if (result.count === 0) throw new Error("INSUFFICIENT_STOCK");
        }
        if (current.couponCode) await reconsumeCouponUse(tx, current.couponCode);
        if (current.shippingCouponCode) await reconsumeCouponUse(tx, current.shippingCouponCode);
      }

      return tx.order.update({ where: { id }, data: { status } });
    });

    if (newlyPaid) {
      const invoiceNumber = getOrderVs(order.createdAt, order.orderNumber);
      const invoicePdf = await generateInvoicePdf({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        address: order.address,
        items: order.items as { name: string; label: string; price: number; qty: number }[],
        totalAmount: order.totalAmount,
        shippingFee: order.shippingFee,
        couponCode: order.couponCode,
        discountAmount: order.discountAmount,
        giftLabel: order.giftLabel,
      });
      after(async () => {
        try {
          await sendPaymentConfirmationEmail(order.customerEmail, {
            orderNumber: order.orderNumber,
            invoiceNumber,
            invoicePdf,
          });
        } catch (err) {
          console.error("Error sending payment confirmation email:", err);
        }
      });
    }

    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "insufficient_stock" }, { status: 409 });
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_COUPON") {
      return NextResponse.json({ error: "insufficient_coupon" }, { status: 409 });
    }
    console.error("PATCH /api/admin/orders/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");

      // Release the stock the order was holding, unless it was already
      // cancelled (already released).
      if (current.status !== "cancelled") {
        const items = current.items as { sku: string; qty: number }[];
        for (const item of items) {
          await tx.merchVariant.updateMany({
            where: { sku: item.sku },
            data: { quantity: { increment: item.qty } },
          });
        }
        if (current.couponCode) await releaseCouponUse(tx, current.couponCode);
        if (current.shippingCouponCode) await releaseCouponUse(tx, current.shippingCouponCode);
      }

      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("DELETE /api/admin/orders/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
