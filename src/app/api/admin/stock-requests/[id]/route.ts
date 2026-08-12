import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAdmin } from "@/lib/apiHandler";

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/stock-requests/[id]",
  async ({ req, params: { id } }) => {
  const { fulfilled } = await req.json();

  const stockRequest = await prisma.stockRequest.update({
    where: { id },
    data: { fulfilled: !!fulfilled },
  });

  return NextResponse.json(stockRequest);
  }
);

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/stock-requests/[id]",
  async ({ params: { id } }) => {
  await prisma.stockRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
  }
);
