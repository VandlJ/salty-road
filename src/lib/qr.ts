import QRCode from 'qrcode';

interface RegistrationInfo {
  brand: string;
  model: string;
  lastName: string;
}

// SPD (Short Payment Descriptor) uses `*` as a field separator and `+`/newline
// have special meaning too. Registration fields (brand/model/lastName) are
// user-supplied, so a value like `Novák*AM:1.00` would inject a bogus second
// AM (amount) field into the string. Strip everything the spec treats as
// syntax before it goes anywhere near the payment string.
function sanitizeSpdField(value: string): string {
  return value.replace(/[*+\r\n]/g, "").trim();
}

export function generateSPD(reg: RegistrationInfo): string {
  const account = process.env.BANK_ACCOUNT_IBAN;
  if (!account) throw new Error("BANK_ACCOUNT_IBAN not configured");
  const amount = "299.00";
  const currency = "CZK";

  const brand = sanitizeSpdField(reg.brand);
  const model = sanitizeSpdField(reg.model);
  const lastName = sanitizeSpdField(reg.lastName);

  const message = sanitizeSpdField(`SaltyRoad ${brand} ${model} ${lastName}`).slice(0, 60);

  // SPD format
  return `SPD*1.0*ACC:${account}*AM:${amount}*CC:${currency}*MSG:${message}`;
}

export async function generateQRCodeBase64(text: string): Promise<string> {
  // Returns base64 string of the PNG
  const buffer = await QRCode.toBuffer(text);
  return buffer.toString('base64');
}
