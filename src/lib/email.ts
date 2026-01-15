import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const from = process.env.EMAIL_FROM || 'Salty Road <onboarding@resend.dev>';

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured. Skipping email.");
    return;
  }

  try {
    const data = await resend.emails.send({
      from,
      to,
      subject,
      text,
      html,
    });
    console.log("Email sent:", data);
  } catch (error) {
    console.error("Resend error:", error);
  }
}