import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const VALID_STATUSES = new Set(["pending", "paid", "shipped", "cancelled"]);

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

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id } });
      if (!current) throw new Error("NOT_FOUND");

      const items = current.items as { sku: string; qty: number }[];

      if (status === "cancelled" && current.status !== "cancelled") {
        // Order is being cancelled — release the stock it was holding.
        for (const item of items) {
          await tx.merchVariant.updateMany({
            where: { sku: item.sku },
            data: { quantity: { increment: item.qty } },
          });
        }
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
      }

      return tx.order.update({ where: { id }, data: { status } });
    });

    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "insufficient_stock" }, { status: 409 });
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
