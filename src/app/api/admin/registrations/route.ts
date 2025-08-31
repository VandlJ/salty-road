import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function getAdminFromReq(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = /admin_token=([^;]+)/.exec(cookie);
  if (!match) return null;
  const token = match[1];
  return prisma.admin.findFirst({ where: { sessionToken: token } });
}

export async function GET(req: Request) {
  const admin = await getAdminFromReq(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regs = await prisma.registration.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(regs);
}

export async function PATCH(req: Request) {
  const admin = await getAdminFromReq(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json();
  if (!id || !["accept", "decline"].includes(action))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const status = action === "accept" ? "accepted" : "declined";
  const updated = await prisma.registration.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ success: true, updated });
}