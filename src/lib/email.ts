import { Resend } from 'resend';
import { registrationRejectedEmail } from '@/emails/registration-rejected.mjs';
import { registrationAcceptedEmail } from '@/emails/registration-accepted.mjs';
import { merchOrderConfirmationEmail } from '@/emails/merch-order-confirmation.mjs';
import { restockNotificationEmail } from '@/emails/restock-notification.mjs';
import { paymentConfirmationEmail } from '@/emails/payment-confirmation.mjs';

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
  attachments?: Attachment[],
  from?: string
) {
  from = from || process.env.EMAIL_FROM || 'Salty Road <onboarding@resend.dev>';

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

// Shop emails use their own sender address, separate from EMAIL_FROM (which
// is the event-registration sender) — falls back to EMAIL_FROM if unset so
// this doesn't silently break in an environment that hasn't been configured
// with the new var yet.
export const SHOP_EMAIL_FROM = process.env.SHOP_EMAIL_FROM || process.env.EMAIL_FROM;

// Vol.1 exhibitor thank-you email is a one-off blast, not part of the
// registration flow — reads better from the general-inquiries address than
// EMAIL_FROM's registration@. Falls back to EMAIL_FROM if unset.
export const VOL1_THANK_YOU_EMAIL_FROM = process.env.VOL1_THANK_YOU_EMAIL_FROM || process.env.EMAIL_FROM;

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
      : undefined,
    SHOP_EMAIL_FROM
  );
}

export async function sendPaymentConfirmationEmail(
  to: string,
  details: { orderNumber: number; invoiceNumber: string; invoicePdf: Buffer }
) {
  const { subject, text } = paymentConfirmationEmail(details);
  await sendEmail(to, subject, text, undefined, [
    {
      filename: `faktura-${details.invoiceNumber}.pdf`,
      content: details.invoicePdf.toString('base64'),
    },
  ], SHOP_EMAIL_FROM);
}

export async function sendRestockNotificationEmail(
  to: string,
  details: { productName: string; variantLabel: string; productUrl: string }
) {
  const { subject, text } = restockNotificationEmail(details);
  await sendEmail(to, subject, text, undefined, undefined, SHOP_EMAIL_FROM);
}
