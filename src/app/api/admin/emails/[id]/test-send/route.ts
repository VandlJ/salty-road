import { NextResponse } from "next/server";
import { EMAIL_TEMPLATES, buildEmailPreview } from "@/lib/emailPreview";
import { sendEmail, SHOP_EMAIL_FROM, THANK_YOU_EMAIL_FROM } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { EMAIL_RE } from "@/lib/constants";
import { withAdmin } from "@/lib/apiHandler";

// Mirrors the sender each template actually goes out from in production,
// so a test-send previews the real "From" address too, not just content.
const TEMPLATE_FROM: Record<string, string | undefined> = {
  "merch-order-confirmation": SHOP_EMAIL_FROM,
  "merch-order-admin-notification": SHOP_EMAIL_FROM,
  "exhibitor-thank-you": THANK_YOU_EMAIL_FROM,
};

export const POST = withAdmin<{ id: string }>(
  "POST /api/admin/emails/[id]/test-send",
  async ({ req, params: { id } }) => {
    if (!(await rateLimit(`admin-email-test-send:${getClientIp(req)}`, 10, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
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
          : undefined,
        TEMPLATE_FROM[id]
      );
      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("POST /api/admin/emails/[id]/test-send error:", err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }
);
