import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const MAX_LEN = { category: 40, name: 100, description: 2000 };
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
    const { category, name, description, active, photoMode, photos, sizeChartImage, order, giftEligible } = body;

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    if (photoMode !== undefined && photoMode !== "shared" && photoMode !== "per_variant") {
      return NextResponse.json({ error: "invalid_photo_mode" }, { status: 400 });
    }
    if (photos !== undefined && (!isStringArray(photos) || photos.length > MAX_PHOTOS)) {
      return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
    }
    if (order !== undefined && !Number.isInteger(order)) {
      return NextResponse.json({ error: "invalid_order" }, { status: 400 });
    }

    const product = await prisma.merchProduct.update({
      where: { id },
      data: {
        ...(category !== undefined && { category }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(active !== undefined && { active: !!active }),
        ...(photoMode !== undefined && { photoMode }),
        ...(photos !== undefined && { photos }),
        ...(sizeChartImage !== undefined && { sizeChartImage: sizeChartImage || null }),
        ...(order !== undefined && { order }),
        ...(giftEligible !== undefined && { giftEligible: !!giftEligible }),
      },
      include: { variants: { orderBy: { order: Prisma.SortOrder.asc } } },
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error("PATCH /api/admin/merch/products/[id] error:", err);
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
    // Variants cascade-delete with the product. Existing orders keep their
    // own item snapshot, so this is safe even for previously-sold products.
    await prisma.merchProduct.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/merch/products/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
