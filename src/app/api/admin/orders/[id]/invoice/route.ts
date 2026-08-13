import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/invoice";
import { getOrderVs } from "@/lib/orderVs";
import { withAdmin, notFound } from "@/lib/apiHandler";

// On-demand invoice PDF for the admin UI — independent of the automatic
// one sent by e-mail when an order transitions to "paid" (see
// /api/admin/orders/[id]/route.ts), so it works for any order at any time.
export const GET = withAdmin<{ id: string }>(
  "GET /api/admin/orders/[id]/invoice",
  async ({ params: { id } }) => {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw notFound();

    const invoiceNumber = getOrderVs(order.createdAt, order.orderNumber);
    const pdf = await generateInvoicePdf({
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

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="faktura-${invoiceNumber}.pdf"`,
      },
    });
  }
);
