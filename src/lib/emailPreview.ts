import { registrationReceivedEmail } from "@/emails/registration-received.mjs";
import { registrationAdminNotificationEmail } from "@/emails/registration-admin-notification.mjs";
import { registrationAcceptedEmail } from "@/emails/registration-accepted.mjs";
import { registrationRejectedEmail } from "@/emails/registration-rejected.mjs";
import { merchOrderConfirmationEmail } from "@/emails/merch-order-confirmation.mjs";
import { merchOrderAdminNotificationEmail } from "@/emails/merch-order-admin-notification.mjs";
import { eventInfoSummaryEmail } from "@/emails/event-info-summary.mjs";
import { vol1ExhibitorThankYouEmail } from "@/emails/vol1-exhibitor-thank-you.mjs";
import { generateSPD, generateQRCodeBase64 } from "@/lib/qr";
import { SITE_URL } from "@/lib/seo";

export interface EmailTemplateMeta {
  id: string;
  label: string;
  hasQr: boolean;
}

// One entry per file in src/emails/ — this list (and only this list) is
// what the admin "Emails" preview page shows, so a new template file needs
// a matching entry here to show up.
export const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  { id: "registration-received", label: "Registrace přijata (uchazeč)", hasQr: false },
  { id: "registration-admin-notification", label: "Nová registrace (admin)", hasQr: false },
  { id: "registration-accepted", label: "Registrace schválena", hasQr: true },
  { id: "registration-rejected", label: "Registrace zamítnuta", hasQr: false },
  { id: "merch-order-confirmation", label: "Potvrzení objednávky (zákazník)", hasQr: true },
  { id: "merch-order-admin-notification", label: "Nová objednávka (admin)", hasQr: false },
  { id: "event-info-summary", label: "Předakcový souhrn informací", hasQr: false },
  { id: "vol1-exhibitor-thank-you", label: "Vol.1 poděkování vystavovatelům", hasQr: false },
];

export interface EmailPreview {
  subject: string;
  text: string;
  html?: string;
  qrCodeBase64?: string;
}

const SAMPLE_ITEMS = [
  { name: "Mikina Černá", label: "L / Černá", price: 145000, qty: 1 },
  { name: "Kšiltovka Černá", label: "Černá", price: 45000, qty: 2 },
];
const SAMPLE_TOTAL = SAMPLE_ITEMS.reduce((sum, i) => sum + i.price * i.qty, 0);

async function sampleQr(amount: number, vs: string): Promise<string | undefined> {
  try {
    const spd = generateSPD({ amount, message: `PREVIEW ${vs}`, vs });
    return await generateQRCodeBase64(spd);
  } catch (err) {
    // BANK_ACCOUNT_IBAN might not be configured in every environment —
    // the preview still works without the QR image in that case.
    console.error("sampleQr failed:", err);
    return undefined;
  }
}

export async function buildEmailPreview(id: string): Promise<EmailPreview> {
  const siteUrl = process.env.NEXT_PUBLIC_URL || SITE_URL;

  switch (id) {
    case "registration-received":
      return registrationReceivedEmail({ registrationId: "sample1234567890", siteUrl });

    case "registration-admin-notification":
      return registrationAdminNotificationEmail({
        firstName: "Jan",
        lastName: "Novák",
        email: "jan.novak@example.com",
        instagram: "@jan.novak",
        brand: "BMW",
        model: "M3",
        year: "2023",
        description: "Ukázkový popis vozu pro náhled e-mailu.",
        registrationId: "sample1234567890",
        photoCount: 3,
        siteUrl,
      });

    case "registration-accepted": {
      const result = registrationAcceptedEmail();
      const qrCodeBase64 = await sampleQr(299, "0000000001");
      return { ...result, qrCodeBase64 };
    }

    case "registration-rejected":
      return registrationRejectedEmail();

    case "merch-order-confirmation": {
      const result = merchOrderConfirmationEmail({
        orderId: "sample-order-id",
        vs: "2607300099",
        items: SAMPLE_ITEMS,
        totalAmount: SAMPLE_TOTAL,
        paymentMethod: "bank_transfer",
        deliveryMethod: "shipping",
        shippingFee: 9900,
        address: "Ukázková 1, 301 00 Plzeň",
        hasQr: true,
      });
      const qrCodeBase64 = await sampleQr(SAMPLE_TOTAL / 100, "2607300099");
      return { ...result, qrCodeBase64 };
    }

    case "merch-order-admin-notification":
      return merchOrderAdminNotificationEmail({
        orderId: "sample-order-id",
        customerName: "Jan Novák",
        customerEmail: "jan.novak@example.com",
        customerPhone: "+420 777 123 456",
        address: "Ukázková 1, 301 00 Plzeň",
        paymentMethod: "bank_transfer",
        items: SAMPLE_ITEMS,
        totalAmount: SAMPLE_TOTAL,
      });

    case "event-info-summary":
      return eventInfoSummaryEmail();

    case "vol1-exhibitor-thank-you":
      return vol1ExhibitorThankYouEmail({ firstName: "Jan", couponCode: "SALTYVOL1", siteUrl });

    default:
      throw new Error("UNKNOWN_TEMPLATE");
  }
}
