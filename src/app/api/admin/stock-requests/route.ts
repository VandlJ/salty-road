import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const GET = withAdmin(
  "GET /api/admin/stock-requests",
  async () => {
      const requests = await prisma.stockRequest.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(requests);
  }
);
