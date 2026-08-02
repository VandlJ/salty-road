import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { active, maxUses, expiresAt, categories } = body;

    if (maxUses !== undefined && maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return NextResponse.json({ error: "invalid_max_uses" }, { status: 400 });
    }
    if (
      categories !== undefined &&
      (!Array.isArray(categories) || !categories.every((c) => typeof c === "string"))
    ) {
      return NextResponse.json({ error: "invalid_categories" }, { status: 400 });
    }

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      // Invalid input (e.g. a malformed string) parses to "Invalid Date"
      // rather than throwing — isNaN is the only reliable way to catch it.
      // A past date is allowed here (unlike creation) — it's a legitimate
      // way for an admin to expire a coupon immediately.
      if (isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
      }
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(active !== undefined && { active: !!active }),
        ...(maxUses !== undefined && { maxUses }),
        ...(expiresAt !== undefined && { expiresAt: parsedExpiresAt }),
        ...(categories !== undefined && { categories }),
      },
    });

    return NextResponse.json(coupon);
  } catch (err) {
    console.error("PATCH /api/admin/coupons/[id] error:", err);
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
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/coupons/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
