import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { EMAIL_TEMPLATES, buildEmailPreview } from "@/lib/emailPreview";
import { sendEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit(`admin-email-test-send:${getClientIp(req)}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { id } = await params;
  if (!EMAIL_TEMPLATES.some((t) => t.id === id)) {
    return NextResponse.json({ error: "unknown_template" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const to = body?.to;
  if (typeof to !== "string" || !EMAIL_RE.test(to)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const { subject, text, html, qrCodeBase64 } = await buildEmailPreview(id);
    await sendEmail(
      to,
      `[PREVIEW] ${subject}`,
      text,
      html,
      qrCodeBase64
        ? [{ filename: "qr-platba.png", content: qrCodeBase64, contentId: "qr-code" }]
        : undefined
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/emails/[id]/test-send error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
