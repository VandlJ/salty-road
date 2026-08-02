import { Resend } from 'resend';
import { registrationRejectedEmail } from '@/emails/registration-rejected.mjs';
import { registrationAcceptedEmail } from '@/emails/registration-accepted.mjs';
import { merchOrderConfirmationEmail } from '@/emails/merch-order-confirmation.mjs';

// Instantiated lazily: the Resend constructor throws if the key is missing,
// which would otherwise crash module evaluation (and the build) in any
// environment where RESEND_API_KEY isn't set yet.
let resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

interface Attachment {
  filename: string;
  content: Buffer | string;
  contentId?: string;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
  attachments?: Attachment[]
) {
  const from = process.env.EMAIL_FROM || 'Salty Road <onboarding@resend.dev>';

  const client = getResendClient();
  if (!client) {
    console.warn("RESEND_API_KEY not configured. Skipping email.");
    return;
  }

  try {
    await client.emails.send({
      from,
      to,
      subject,
      text,
      html,
      attachments,
    });
  } catch (error) {
    console.error("Resend error:", error);
  }
}

export async function sendRejectionEmail(to: string) {
  const { subject, text, html } = registrationRejectedEmail();
  await sendEmail(to, subject, text, html);
}

export async function sendAcceptanceEmail(to: string, qrCodeBase64: string) {
  const { subject, text, html } = registrationAcceptedEmail();
  await sendEmail(to, subject, text, html, [
    {
      filename: 'qr-platba.png',
      content: qrCodeBase64,
      contentId: 'qr-code'
    }
  ]);
}

interface MerchOrderItem {
  name: string;
  label: string;
  price: number; // halire
  qty: number;
}

interface MerchOrderDetails {
  orderId: string;
  vs: string;
  items: MerchOrderItem[];
  totalAmount: number; // halire
  paymentMethod: string; // "bank_transfer" | "cod"
  deliveryMethod?: "shipping" | "pickup";
  shippingFee?: number; // halire
  address?: string | null;
  couponCode?: string | null;
  discountAmount?: number; // halire
  shippingCouponCode?: string | null;
  giftLabel?: string | null;
}

export async function sendMerchOrderConfirmationEmail(
  to: string,
  order: MerchOrderDetails,
  qrCodeBase64?: string
) {
  const { subject, text, html } = merchOrderConfirmationEmail({
    ...order,
    hasQr: !!qrCodeBase64,
  });

  await sendEmail(
    to,
    subject,
    text,
    html,
    qrCodeBase64
      ? [{ filename: 'qr-platba.png', content: qrCodeBase64, contentId: 'qr-code' }]
      : undefined
  );
}
