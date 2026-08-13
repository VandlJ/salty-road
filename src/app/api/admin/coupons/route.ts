import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAdmin, conflict } from "@/lib/apiHandler";

const MAX_CODE_LEN = 40;

export const GET = withAdmin(
  "GET /api/admin/coupons",
  async () => {
      const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
      return NextResponse.json(coupons);
  }
);

export const POST = withAdmin("POST /api/admin/coupons", async ({ req }) => {
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

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      // Invalid input (e.g. a malformed string) parses to "Invalid Date"
      // rather than throwing — isNaN is the only reliable way to catch it.
      // Also reject a date already in the past: nothing legitimate creates
      // a coupon that's expired from the moment it exists.
      if (isNaN(parsedExpiresAt.getTime()) || parsedExpiresAt <= new Date()) {
        return NextResponse.json({ error: "invalid_expires_at" }, { status: 400 });
      }
    }

    try {
      const coupon = await prisma.coupon.create({
        data: {
          code: code.trim().toUpperCase(),
          type,
          value,
          maxUses: maxUses ?? null,
          expiresAt: parsedExpiresAt,
          categories: Array.isArray(categories) ? categories : [],
        },
      });
      return NextResponse.json(coupon, { status: 201 });
    } catch (err) {
      // `code` is unique — a collision is the user picking a code that
      // already exists, not a fault. Rethrown as an ApiError so withAdmin
      // answers 409 instead of logging it as a 500.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw conflict("code_taken");
      }
      throw err;
    }
  }
);
