import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";

const MAX_LEN = { slug: 80, category: 40, name: 100, description: 2000 };

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const products = await prisma.merchProduct.findMany({
      orderBy: { createdAt: Prisma.SortOrder.desc },
      include: {
        variants: { orderBy: { order: Prisma.SortOrder.asc } },
      },
    });
    return NextResponse.json(products);
  } catch (err) {
    console.error("GET /api/admin/merch/products error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { slug, category, name, description } = body;

    if (!slug || !category || !name || !description) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
    }

    const product = await prisma.merchProduct.create({
      data: { slug, category, name, description },
      include: { variants: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }
    console.error("POST /api/admin/merch/products error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
