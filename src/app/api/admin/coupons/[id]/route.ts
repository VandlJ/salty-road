import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/coupons/[id]",
  async ({ req, params: { id } }) => {
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
  }
);

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/coupons/[id]",
  async ({ params: { id } }) => {
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
  }
);
