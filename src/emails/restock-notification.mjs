// Sent to a customer who asked to be notified about an out-of-stock variant,
// once the admin restocks it (quantity goes from 0 to >0).
export function restockNotificationEmail({ productName, variantLabel, productUrl }) {
  const subject = `Skladem: ${productName}`;

  const text = `Dobrý den,

varianta, kterou jste chtěli, je zpět skladem:

Produkt: ${productName}
Varianta: ${variantLabel}

Objednat: ${productUrl}

Tým Salty Road Meet`;

  return { subject, text };
}
