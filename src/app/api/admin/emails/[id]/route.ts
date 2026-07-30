import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { EMAIL_TEMPLATES, buildEmailPreview } from "@/lib/emailPreview";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!EMAIL_TEMPLATES.some((t) => t.id === id)) {
    return NextResponse.json({ error: "unknown_template" }, { status: 404 });
  }

  try {
    const preview = await buildEmailPreview(id);
    return NextResponse.json(preview);
  } catch (err) {
    console.error("GET /api/admin/emails/[id] error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
