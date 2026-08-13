import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { contactMessageEmail } from "@/emails/contact-message.mjs";
import { EMAIL_RE } from "@/lib/constants";
import { logError } from "@/lib/logError";

const MAX_LEN = { name: 100, email: 200, message: 2000 };

export async function POST(req: Request) {
  if (!(await rateLimit(`contact:${getClientIp(req)}`, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    // A non-string here otherwise skips the MAX_LEN guard below entirely
    // (it only checks string values) and surfaces as an opaque 500 from
    // Prisma instead of a clean 400.
    for (const field of ["name", "email", "message"] as const) {
      if (typeof body[field] !== "string") {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    const contactMessage = await prisma.contactMessage.create({
      data: { name, email, message },
    });

    // Deferred so the response isn't blocked on a Resend API call — a
    // slow/failed send never affects the message itself (already saved).
    after(async () => {
      try {
        const orderEmail = process.env.ORDER_EMAIL || process.env.ADMIN_EMAIL;
        if (orderEmail) {
          const notification = contactMessageEmail({ name, email, message });
          await sendEmail(orderEmail, notification.subject, notification.text);
        }
      } catch (err) {
        logError("contact:notification-email", err, { messageId: contactMessage.id });
      }
    });

    return NextResponse.json({ id: contactMessage.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
