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
    const { fulfilled } = await req.json();

    const stockRequest = await prisma.stockRequest.update({
      where: { id },
      data: { fulfilled: !!fulfilled },
    });

    return NextResponse.json(stockRequest);
  } catch (err) {
    console.error("PATCH /api/admin/stock-requests/[id] error:", err);
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
    await prisma.stockRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/stock-requests/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
