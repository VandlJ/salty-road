// Sent to ORDER_EMAIL (falls back to ADMIN_EMAIL) whenever a customer asks
// to be notified about a currently out-of-stock variant.
export function stockRequestNotificationEmail({
  productName,
  variantLabel,
  sku,
  customerName,
  customerEmail,
}) {
  const subject = `Poptávka nedostupné varianty: ${productName}`;

  const text = `Někdo chce vědět, až bude tohle skladem:

Produkt: ${productName}
Varianta: ${variantLabel}
SKU: ${sku}

Zákazník: ${customerName}
Email: ${customerEmail}

Vyřízené poptávky najdeš v adminu na /admin/orders.`;

  return { subject, text };
}
