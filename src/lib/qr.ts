import QRCode from 'qrcode';

interface SpdParams {
  amount: number; // whole currency units, e.g. 299 for 299 Kc
  message: string;
}

// SPD (Short Payment Descriptor) uses `*` as a field separator and `+`/newline
// have special meaning too. The message is often built from user-supplied
// text (names, product labels), so a value like `Novak*AM:1.00` would inject
// a bogus second AM (amount) field into the string. Strip everything the
// spec treats as syntax before it goes anywhere near the payment string.
function sanitizeSpdField(value: string): string {
  return value.replace(/[*+\r\n]/g, "").trim();
}

export function generateSPD({ amount, message }: SpdParams): string {
  const account = process.env.BANK_ACCOUNT_IBAN;
  if (!account) throw new Error("BANK_ACCOUNT_IBAN not configured");
  const currency = "CZK";

  const cleanMessage = sanitizeSpdField(message).slice(0, 60);

  // SPD format
  return `SPD*1.0*ACC:${account}*AM:${amount.toFixed(2)}*CC:${currency}*MSG:${cleanMessage}`;
}

export async function generateQRCodeBase64(text: string): Promise<string> {
  // Returns base64 string of the PNG
  const buffer = await QRCode.toBuffer(text);
  return buffer.toString('base64');
}
