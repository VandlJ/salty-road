import { NextResponse } from "next/server";
import type { Edition } from "@prisma/client";
import prisma from "@/lib/prisma";
import { sendEmail, THANK_YOU_EMAIL_FROM } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { exhibitorThankYouEmail } from "@/emails/exhibitor-thank-you.mjs";
import { SITE_URL } from "@/lib/seo";
import { EMAIL_RE, RegStatus } from "@/lib/constants";
import { requireCurrentEdition } from "@/lib/edition";
import { withAdmin } from "@/lib/apiHandler";
import { logError } from "@/lib/logError";

// "Arrived" is the source of truth for who actually showed up — set by
// crew checking people off at /entry — independent of paymentStatus (an
// accepted, arrived registration is by definition someone who was let in).
const eligibleWhere = (editionId: string) =>
  ({ editionId, status: RegStatus.Accepted, arrived: true }) as const;

// The closing "see you at …" line. Uses the real next edition when one has
// been created, otherwise derives the label from this edition's number so
// the sentence still reads correctly before next year exists as a row.
async function nextEditionLabelFor(edition: Edition): Promise<string> {
  const next = await prisma.edition.findFirst({
    where: { number: { gt: edition.number } },
    orderBy: { number: "asc" },
  });
  if (next) return `${next.name} v roce ${next.startDate.getFullYear()}`;
  return `Volume ${edition.number + 1}`;
}

export const GET = withAdmin(
  "GET /api/admin/registrations/thank-you-email",
  async () => {
    const edition = await requireCurrentEdition();
    const where = eligibleWhere(edition.id);

    const [total, alreadySent] = await Promise.all([
      prisma.registration.count({ where }),
      prisma.registration.count({ where: { ...where, thankYouEmailSentAt: { not: null } } }),
    ]);

    return NextResponse.json({
      total,
      alreadySent,
      remaining: total - alreadySent,
      editionName: edition.name,
    });
  }
);

// Resend's standard rate limit is ~2 req/sec — spacing sends out keeps a
// full blast to every exhibitor from tripping it.
const SEND_DELAY_MS = 400;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const POST = withAdmin(
  "POST /api/admin/registrations/thank-you-email",
  async ({ req }) => {
    if (!(await rateLimit(`admin-thank-you-send:${getClientIp(req)}`, 3, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { couponCode, confirm, manualTo, manualName } = await req.json();
    if (typeof couponCode !== "string" || !couponCode.trim()) {
      return NextResponse.json({ error: "missing_coupon_code" }, { status: 400 });
    }

    const edition = await requireCurrentEdition();
    const siteUrl = process.env.NEXT_PUBLIC_URL || SITE_URL;
    const nextEditionLabel = await nextEditionLabelFor(edition);
    const code = couponCode.trim().toUpperCase();

    const buildEmail = (firstName: string) =>
      exhibitorThankYouEmail({
        firstName,
        couponCode: code,
        siteUrl,
        editionName: edition.name,
        nextEditionLabel,
      });

    // Manual one-off send to an arbitrary address — for people not in the
    // Registration table at all (e.g. a deleted registration), so it's a
    // real send but deliberately untracked (no thankYouEmailSentAt to touch).
    if (typeof manualTo === "string" && manualTo.trim()) {
      if (!EMAIL_RE.test(manualTo.trim())) {
        return NextResponse.json({ error: "invalid_email" }, { status: 400 });
      }
      const { subject, text, html } = buildEmail(
        typeof manualName === "string" ? manualName.trim() : ""
      );
      await sendEmail(manualTo.trim(), subject, text, html, undefined, THANK_YOU_EMAIL_FROM);
      return NextResponse.json({ success: true });
    }

    if (confirm !== true) {
      return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
    }

    const recipients = await prisma.registration.findMany({
      where: { ...eligibleWhere(edition.id), thankYouEmailSentAt: null },
      select: { id: true, firstName: true, email: true },
    });

    let sent = 0;
    const failed: string[] = [];

    for (const recipient of recipients) {
      try {
        const { subject, text, html } = buildEmail(recipient.firstName);
        await sendEmail(recipient.email, subject, text, html, undefined, THANK_YOU_EMAIL_FROM);
        await prisma.registration.update({
          where: { id: recipient.id },
          data: { thankYouEmailSentAt: new Date() },
        });
        sent += 1;
      } catch (err) {
        logError("registrations:thank-you-email", err, { registrationId: recipient.id });
        failed.push(recipient.id);
      }
      await sleep(SEND_DELAY_MS);
    }

    return NextResponse.json({ sent, failed: failed.length, total: recipients.length });
  }
);
