import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import { eventInfoSummaryEmail } from "../src/emails/event-info-summary.mjs";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const SEND_ALL = process.argv.includes("--all");
const TEST_EMAIL = process.env.TEST_EMAIL;

if (!SEND_ALL && !TEST_EMAIL) {
  console.error("Set TEST_EMAIL env var for a test run, or pass --all to email every accepted registration.");
  console.error("Usage: TEST_EMAIL=you@example.com node scripts/sendInfoEmail.mjs");
  process.exit(1);
}

const { subject, text, html } = eventInfoSummaryEmail();

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured.");
    process.exit(1);
  }

  const where = {
    status: "accepted",
    infoEmailSentAt: null,
    ...(SEND_ALL ? {} : { email: TEST_EMAIL }),
  };

  const registrations = await prisma.registration.findMany({ where });

  console.log(
    `Mode: ${SEND_ALL ? "ALL accepted registrations" : `TEST (only ${TEST_EMAIL})`}`
  );
  console.log(`Found ${registrations.length} registration(s) to email.`);

  for (const reg of registrations) {
    try {
      const from = process.env.EMAIL_FROM || "Salty Road <onboarding@resend.dev>";
      await resend.emails.send({
        from,
        to: reg.email,
        subject,
        text,
        html,
      });
      await prisma.registration.update({
        where: { id: reg.id },
        data: { infoEmailSentAt: new Date() },
      });
      console.log(`Sent to ${reg.email} (${reg.firstName} ${reg.lastName})`);
    } catch (err) {
      console.error(`Failed to send to ${reg.email}:`, err);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
