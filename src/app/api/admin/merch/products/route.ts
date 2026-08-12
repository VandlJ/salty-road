import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { compareVariantsForDisplay } from "@/lib/variantLabel";
import { withAdmin, conflict } from "@/lib/apiHandler";

const MAX_LEN = { slug: 80, category: 40, name: 100, description: 2000 };

export const GET = withAdmin(
  "GET /api/admin/merch/products",
  async () => {
      const products = await prisma.merchProduct.findMany({
        // Same order the public shop grid uses, so the admin list matches
        // what customers see (and reorder buttons feel intuitive).
        orderBy: { order: Prisma.SortOrder.asc },
        include: {
          variants: { orderBy: { order: Prisma.SortOrder.asc } },
        },
      });
      for (const p of products) p.variants.sort(compareVariantsForDisplay);
      return NextResponse.json(products);
  }
);

export const POST = withAdmin("POST /api/admin/merch/products", async ({ req }) => {
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

    // New products go to the end of the shop display order.
    const { _max } = await prisma.merchProduct.aggregate({ _max: { order: true } });

    try {
      const product = await prisma.merchProduct.create({
        data: { slug, category, name, description, order: (_max.order ?? -1) + 1 },
        include: { variants: true },
      });
      return NextResponse.json(product, { status: 201 });
    } catch (err) {
      // `slug` is unique — a collision means the admin reused one, which is
      // a 409 for them to fix, not a server fault to log.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw conflict("slug_taken");
      }
      throw err;
    }
  }
);
