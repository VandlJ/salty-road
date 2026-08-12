import { NextResponse, after } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getRegistrationOpen } from "@/lib/registration";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { registrationReceivedEmail } from "@/emails/registration-received.mjs";
import { registrationAdminNotificationEmail } from "@/emails/registration-admin-notification.mjs";
import { SITE_URL } from "@/lib/seo";
import { EMAIL_RE } from "@/lib/constants";
import { requireCurrentEdition, editionEmailFacts } from "@/lib/edition";

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
      photos,
      idempotencyKey: rawIdempotencyKey,
    } = body;
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" && rawIdempotencyKey.length > 0
        ? rawIdempotencyKey
        : null;

    // A network retry or double-submit sends the same client-generated key
    // twice — return the already-created registration instead of creating
    // a duplicate (same pattern as the merch checkout route).
    if (idempotencyKey) {
      const existing = await prisma.registration.findUnique({ where: { idempotencyKey } });
      if (existing) return NextResponse.json({ id: existing.id }, { status: 201 });
    }

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

    // A new sign-up always belongs to whichever edition is currently open.
    const edition = await requireCurrentEdition();

    let record;
    try {
      record = await prisma.registration.create({
        data: {
          editionId: edition.id,
          firstName,
          lastName,
          email,
          brand,
          model,
          year,
          description,
          instagram: instagram || null,
          photos: uploadedUrls,
          idempotencyKey,
        },
      });
    } catch (err) {
      // Two truly concurrent requests with the same key can both pass the
      // findUnique check above before either commits — the loser hits the
      // unique constraint here. Return the winner's record instead of a
      // 500 the customer would read as "try again" (and submit a dupe).
      if (idempotencyKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const existing = await prisma.registration.findUnique({ where: { idempotencyKey } });
        if (existing) return NextResponse.json({ id: existing.id }, { status: 201 });
      }
      throw err;
    }

    // Emails are deferred via after() so the response isn't blocked on two
    // Resend API calls — a slow/failed send never affects the registration
    // itself (it already committed above).
    after(async () => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const siteUrl = process.env.NEXT_PUBLIC_URL || SITE_URL;

        const userEmail = registrationReceivedEmail({
          registrationId: record.id,
          siteUrl,
          ...editionEmailFacts(edition),
        });
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

        await Promise.all([
          sendEmail(email, userEmail.subject, userEmail.text),
          adminEmail
            ? sendEmail(adminEmail, adminNotification.subject, adminNotification.text)
            : Promise.resolve(),
        ]);
      } catch (err) {
        console.error("Error sending registration emails:", err);
      }
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
