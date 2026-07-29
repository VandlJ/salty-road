import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
