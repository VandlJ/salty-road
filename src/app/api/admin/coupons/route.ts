import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const MAX_CODE_LEN = 40;

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(coupons);
  } catch (err) {
    console.error("GET /api/admin/coupons error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { code, type, maxUses, expiresAt, categories } = body;
    // Value is meaningless for a shipping-only coupon — force it to 0
    // server-side regardless of what the client sends.
    const value = type === "free_shipping" ? 0 : body.value;

    if (
      !code ||
      (type !== "percent" && type !== "fixed" && type !== "free_shipping") ||
      !Number.isInteger(value) ||
      (type !== "free_shipping" && value <= 0)
    ) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (typeof code !== "string" || code.length > MAX_CODE_LEN) {
      return NextResponse.json({ error: "field_too_long" }, { status: 400 });
    }
    if (type === "percent" && value > 100) {
      return NextResponse.json({ error: "invalid_value" }, { status: 400 });
    }
    if (maxUses !== undefined && maxUses !== null && (!Number.isInteger(maxUses) || maxUses <= 0)) {
      return NextResponse.json({ error: "invalid_max_uses" }, { status: 400 });
    }
    if (
      categories !== undefined &&
      (!Array.isArray(categories) || !categories.every((c) => typeof c === "string"))
    ) {
      return NextResponse.json({ error: "invalid_categories" }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        type,
        value,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        categories: Array.isArray(categories) ? categories : [],
      },
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "code_taken" }, { status: 409 });
    }
    console.error("POST /api/admin/coupons error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
