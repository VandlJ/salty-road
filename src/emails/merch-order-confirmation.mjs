function formatHalire(halire) {
  return `${(halire / 100).toLocaleString("cs-CZ")} Kč`;
}

// Sent to the customer right after they place a merch order.
/**
 * @param {{
 *   orderId: string, vs: string, items: object[], totalAmount: number,
 *   paymentMethod: string, hasQr: boolean,
 *   deliveryMethod?: "shipping" | "pickup", shippingFee?: number,
 *   address?: string | null,
 *   couponCode?: string | null, discountAmount?: number,
 *   shippingCouponCode?: string | null,
 *   giftLabel?: string | null,
 * }} order
 */
export function merchOrderConfirmationEmail({
  orderId,
  vs,
  items,
  totalAmount,
  paymentMethod,
  hasQr,
  deliveryMethod = "shipping",
  shippingFee = 0,
  address = null,
  couponCode = null,
  discountAmount = 0,
  shippingCouponCode = null,
  giftLabel = null,
}) {
  const subject = `Potvrzení objednávky #${orderId} - Salty Road Shop`;

  const itemLines = items
    .map((i) => `- ${i.name} (${i.label}) x${i.qty} - ${formatHalire(i.price * i.qty)}`)
    .join("\n");

  const paymentText =
    paymentMethod === "bank_transfer"
      ? "Platba: bankovním převodem — QR kód s platebními údaji najdeš níže."
      : "Platba: dobírkou při doručení.";

  const deliveryText =
    deliveryMethod === "pickup"
      ? "Doručení: osobní odběr (po telefonické domluvě)."
      : `Doručení: poštou na adresu ${address ?? ""} (poštovné ${formatHalire(shippingFee)}).`;

  const cancelUrl = `https://www.saltyroad.cz/cs/shop/cancel-order?id=${encodeURIComponent(orderId)}&vs=${encodeURIComponent(vs)}`;
  const cancelText = `Rozmyslel/a sis to? Dokud objednávku neuhradíš, můžeš ji sám/sama zrušit zde: ${cancelUrl}\nPo 14 dnů máš od převzetí zboží i právo odstoupit od smlouvy bez udání důvodu — víc v obchodních podmínkách: https://www.saltyroad.cz/cs/shop/terms`;

  const discountLine =
    couponCode && discountAmount > 0
      ? `Kupón ${couponCode}: -${formatHalire(discountAmount)}\n`
      : "";

  const shippingCouponLine = shippingCouponCode
    ? `Kupón na dopravu zdarma: ${shippingCouponCode}\n`
    : "";

  const giftLine = giftLabel ? `Dárek zdarma: ${giftLabel}\n` : "";

  const text = `Ahoj,

děkujeme za objednávku v Salty Road Shopu!

Objednávka: #${orderId}
Variabilní symbol platby: ${vs}
${itemLines}

${discountLine}${shippingCouponLine}${giftLine}Celkem: ${formatHalire(totalAmount)}

${deliveryText}
${paymentText}

${cancelText}

Tým Salty Road Meet`;

  const itemsHtml = items
    .map((i) => `<li>${i.name} (${i.label}) x${i.qty} — ${formatHalire(i.price * i.qty)}</li>`)
    .join("");

  const discountHtml =
    couponCode && discountAmount > 0
      ? `<p>Kupón ${couponCode}: -${formatHalire(discountAmount)}</p>`
      : "";

  const shippingCouponHtml = shippingCouponCode
    ? `<p>Kupón na dopravu zdarma: ${shippingCouponCode}</p>`
    : "";

  const giftHtml = giftLabel ? `<p>Dárek zdarma: ${giftLabel}</p>` : "";

  const html = `
    <p>Ahoj,</p>
    <p>děkujeme za objednávku v Salty Road Shopu!</p>
    <p><strong>Objednávka: #${orderId}</strong></p>
    <p><strong>Variabilní symbol platby: ${vs}</strong></p>
    <ul>${itemsHtml}</ul>
    ${discountHtml}
    ${shippingCouponHtml}
    ${giftHtml}
    <p><strong>Celkem: ${formatHalire(totalAmount)}</strong></p>
    <p>${deliveryText}</p>
    <p>${paymentText}</p>
    <p>Rozmyslel/a sis to? Dokud objednávku neuhradíš, můžeš ji <a href="${cancelUrl}">sám/sama zrušit zde</a>. Po převzetí zboží máš navíc 14 dnů na odstoupení od smlouvy bez udání důvodu — víc v <a href="https://www.saltyroad.cz/cs/shop/terms">obchodních podmínkách</a>.</p>
    ${
      hasQr
        ? '<div style="margin: 20px 0;"><img src="cid:qr-code" alt="QR Platba" style="width: 200px; height: 200px;" /></div>'
        : ""
    }
    <p>Tým Salty Road Meet</p>
  `;

  return { subject, text, html };
}
