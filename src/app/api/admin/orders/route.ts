import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const GET = withAdmin(
  "GET /api/admin/orders",
  async () => {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: Prisma.SortOrder.desc },
      });
      return NextResponse.json(orders);
  }
);
