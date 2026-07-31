import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const MAX_LEN = { label: 100 };
const MAX_PHOTOS = 20;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { label, price, quantity, images, active, order } = body;

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }
    if (price !== undefined && (!Number.isInteger(price) || price <= 0)) {
      return NextResponse.json({ error: "invalid_price" }, { status: 400 });
    }
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }
    if (images !== undefined && (!isStringArray(images) || images.length > MAX_PHOTOS)) {
      return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
    }
    if (order !== undefined && !Number.isInteger(order)) {
      return NextResponse.json({ error: "invalid_order" }, { status: 400 });
    }

    const variant = await prisma.merchVariant.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(price !== undefined && { price }),
        ...(quantity !== undefined && { quantity }),
        ...(images !== undefined && { images }),
        ...(active !== undefined && { active: !!active }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(variant);
  } catch (err) {
    console.error("PATCH /api/admin/merch/variants/[id] error:", err);
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
    await prisma.merchVariant.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/merch/variants/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
