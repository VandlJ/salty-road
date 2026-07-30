import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { EMAIL_TEMPLATES } from "@/lib/emailPreview";

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json(EMAIL_TEMPLATES);
}
