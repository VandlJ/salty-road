import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getRegistrationOpen } from "@/lib/registration";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { registrationReceivedEmail } from "@/emails/registration-received.mjs";
import { registrationAdminNotificationEmail } from "@/emails/registration-admin-notification.mjs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTOS = 5;
const MAX_LEN = { firstName: 100, lastName: 100, brand: 100, model: 100, year: 10, description: 2000, instagram: 100 };
// Only accept blob URLs we actually issued via /api/upload — never trust a
// client-supplied href just because it's a string.
const BLOB_URL_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

export async function POST(req: Request) {
  if (!(await rateLimit(`register:${getClientIp(req)}`, 20, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  if (!(await getRegistrationOpen())) {
    return NextResponse.json(
      { error: "registration_closed" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      brand,
      model,
      year,
      description,
      instagram,
      photos
    } = body;

    // Server-side validation
    if (!firstName || !lastName || !email || !brand || !model || !year || !description) {
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    // A non-string here otherwise skips the MAX_LEN guard below entirely
    // (it only checks string values) and surfaces as an opaque 500 from
    // Prisma instead of a clean 400 — same regression class already fixed
    // in the checkout route.
    for (const field of ["firstName", "lastName", "brand", "model", "year", "description"] as const) {
      if (typeof body[field] !== "string") {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
      }
    }
    if (instagram != null && typeof instagram !== "string") {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    for (const [field, maxLen] of Object.entries(MAX_LEN)) {
      const value = body[field];
      if (value != null && typeof value === "string" && value.length > maxLen) {
        return NextResponse.json({ error: "field_too_long" }, { status: 400 });
      }
    }

    const uploadedUrls: string[] = Array.isArray(photos)
      ? photos
          .filter((p): p is string => typeof p === "string" && BLOB_URL_RE.test(p))
          .slice(0, MAX_PHOTOS)
      : [];

    const record = await prisma.registration.create({
      data: {
        firstName,
        lastName,
        email,
        brand,
        model,
        year,
        description,
        instagram: instagram || null,
        photos: uploadedUrls,
      },
    });

    // Send emails
    const adminEmail = process.env.ADMIN_EMAIL;
    const siteUrl = process.env.NEXT_PUBLIC_URL || "https://saltyroad.cz";

    const userEmail = registrationReceivedEmail({ registrationId: record.id, siteUrl });
    const adminNotification = registrationAdminNotificationEmail({
      firstName,
      lastName,
      email,
      instagram,
      brand,
      model,
      year,
      description,
      registrationId: record.id,
      photoCount: uploadedUrls.length,
      siteUrl,
    });

    // Await email sending to ensure execution before response closes
    try {
      await Promise.all([
        sendEmail(email, userEmail.subject, userEmail.text),
        adminEmail
          ? sendEmail(adminEmail, adminNotification.subject, adminNotification.text)
          : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Error sending emails:", err);
      // We don't block the success response if emails fail, but we log it.
    }

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
