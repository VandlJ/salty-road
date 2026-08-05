import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";
import { generateInvoicePdf } from "@/lib/invoice";
import { getOrderVs } from "@/lib/orderVs";

// On-demand invoice PDF for the admin UI — independent of the automatic
// one sent by e-mail when an order transitions to "paid" (see
// /api/admin/orders/[id]/route.ts), so it works for any order at any time.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

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
