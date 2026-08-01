// Sent to ORDER_EMAIL (falls back to ADMIN_EMAIL) whenever a merch order
// comes in — kept separate from event registration notifications.
export function merchOrderAdminNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  address,
  deliveryMethod = "shipping",
  paymentMethod,
  items,
  totalAmount,
}) {
  const subject = `Nová objednávka merch #${orderId}`;

  const itemLines = items.map((i) => `- ${i.name} (${i.label}) x${i.qty}`).join("\n");

  const deliveryLine =
    deliveryMethod === "pickup" ? "Doručení: osobní odběr" : `Adresa: ${address ?? ""}`;

  const text = `Nová objednávka v Salty Road Shopu!

Zákazník: ${customerName}
Email: ${customerEmail}
Telefon: ${customerPhone}
${deliveryLine}
Platba: ${paymentMethod}

${itemLines}

Celkem: ${(totalAmount / 100).toLocaleString("cs-CZ")} Kč`;

  return { subject, text };
}
