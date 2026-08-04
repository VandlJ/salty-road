// Sent to the customer when the admin marks their order as paid — carries
// the invoice PDF as an attachment (see @/lib/invoice.ts).
export function paymentConfirmationEmail({ orderNumber, invoiceNumber }) {
  const subject = `Platba přijata — objednávka #${orderNumber} - Salty Road Shop`;

  const text = `Ahoj,

Vaše platba za objednávku #${orderNumber} byla přijata, děkujeme!

V příloze najdete fakturu (č. ${invoiceNumber}).

Nyní objednávku připravujeme k odeslání, brzy se ozveme s dalšími detaily.

Tým Salty Road Meet`;

  return { subject, text };
}
