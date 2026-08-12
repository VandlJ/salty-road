import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";
import { sendEmail, VOL1_THANK_YOU_EMAIL_FROM } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { vol1ExhibitorThankYouEmail } from "@/emails/vol1-exhibitor-thank-you.mjs";
import { SITE_URL } from "@/lib/seo";

// "Arrived" is the source of truth for who actually showed up — set by
// crew checking people off at /entry — independent of paymentStatus (an
// accepted, arrived registration is by definition someone who was let in).
const ELIGIBLE_WHERE = { status: "accepted", arrived: true } as const;

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [total, alreadySent] = await Promise.all([
    prisma.registration.count({ where: ELIGIBLE_WHERE }),
    prisma.registration.count({ where: { ...ELIGIBLE_WHERE, thankYouEmailSentAt: { not: null } } }),
  ]);

  return NextResponse.json({ total, alreadySent, remaining: total - alreadySent });
}

// Resend's standard rate limit is ~2 req/sec — spacing sends out keeps a
// full resend to every Vol.1 exhibitor from tripping it.
const SEND_DELAY_MS = 400;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!(await rateLimit(`admin-vol1-thank-you-send:${getClientIp(req)}`, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { couponCode, confirm } = await req.json();
  if (typeof couponCode !== "string" || !couponCode.trim()) {
    return NextResponse.json({ error: "missing_coupon_code" }, { status: 400 });
  }
  if (confirm !== true) {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  const recipients = await prisma.registration.findMany({
    where: { ...ELIGIBLE_WHERE, thankYouEmailSentAt: null },
    select: { id: true, firstName: true, email: true },
  });

  const siteUrl = process.env.NEXT_PUBLIC_URL || SITE_URL;
  let sent = 0;
  const failed: string[] = [];

  for (const recipient of recipients) {
    try {
      const { subject, text, html } = vol1ExhibitorThankYouEmail({
        firstName: recipient.firstName,
        couponCode: couponCode.trim().toUpperCase(),
        siteUrl,
      });
      await sendEmail(recipient.email, subject, text, html, undefined, VOL1_THANK_YOU_EMAIL_FROM);
      await prisma.registration.update({
        where: { id: recipient.id },
        data: { thankYouEmailSentAt: new Date() },
      });
      sent += 1;
    } catch (err) {
      console.error(`Failed to send Vol.1 thank-you email to registration ${recipient.id}:`, err);
      failed.push(recipient.id);
    }
    await sleep(SEND_DELAY_MS);
  }

  return NextResponse.json({ sent, failed: failed.length, total: recipients.length });
}
