import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { generateInvoicePdf } from "@/lib/invoice";
import { getOrderVs } from "@/lib/orderVs";
import {
  restoreStock,
  releaseCouponUse,
  reconsumeCouponUse,
  type OrderStockItem,
} from "@/lib/orderStock";
import { ORDER_STATUS, OrderStatusValue } from "@/lib/constants";
import { withAdmin, badRequest, notFound, conflict } from "@/lib/apiHandler";
import { logError } from "@/lib/logError";

const VALID_STATUSES: ReadonlySet<string> = new Set(ORDER_STATUS);

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/orders/[id]",
  async ({ req, params: { id } }) => {
    const { status } = await req.json();

    if (!VALID_STATUSES.has(status)) throw badRequest("invalid_status");

    let newlyPaid = false;

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw notFound();

      newlyPaid = status === OrderStatusValue.Paid && current.status !== OrderStatusValue.Paid;

      const items = current.items as OrderStockItem[];

      if (status === OrderStatusValue.Cancelled && current.status !== OrderStatusValue.Cancelled) {
        // Order is being cancelled — release the stock it was holding.
        await restoreStock(tx, items, `PATCH order ${id} (cancel)`);
        if (current.couponCode) await releaseCouponUse(tx, current.couponCode);
        if (current.shippingCouponCode) await releaseCouponUse(tx, current.shippingCouponCode);
      } else if (status !== OrderStatusValue.Cancelled && current.status === "cancelled") {
        // Order is being un-cancelled — re-reserve the stock. Same atomic
        // conditional decrement as checkout, so it can't go negative if
        // stock was sold elsewhere in the meantime.
        for (const item of items) {
          const result = await tx.merchVariant.updateMany({
            where: { sku: item.sku, quantity: { gte: item.qty } },
            data: { quantity: { decrement: item.qty } },
          });
          if (result.count === 0) throw conflict("insufficient_stock");
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
          logError("orders:payment-confirmation-email", err, { orderNumber: order.orderNumber });
        }
      });
    }

    return NextResponse.json(order);
  }
);

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/orders/[id]",
  async ({ params: { id } }) => {
    await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw notFound();

      // Release the stock the order was holding, unless it was already
      // cancelled (already released).
      if (current.status !== OrderStatusValue.Cancelled) {
        await restoreStock(tx, current.items as OrderStockItem[], `DELETE order ${id}`);
        if (current.couponCode) await releaseCouponUse(tx, current.couponCode);
        if (current.shippingCouponCode) await releaseCouponUse(tx, current.shippingCouponCode);
      }

      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  }
);
