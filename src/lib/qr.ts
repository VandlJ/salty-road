import QRCode from 'qrcode';

interface RegistrationInfo {
  brand: string;
  model: string;
  lastName: string;
}

export function generateSPD(reg: RegistrationInfo): string {
  const account = "CZ1327000000001439145008";
  const amount = "299.00";
  const currency = "CZK";
  
  // Clean up strings to ensure they don't break the format
  const brand = reg.brand.trim();
  const model = reg.model.trim();
  const lastName = reg.lastName.trim();
  
  const message = `SaltyRoad ${brand} ${model} ${lastName}`;
  
  // SPD format
  return `SPD*1.0*ACC:${account}*AM:${amount}*CC:${currency}*MSG:${message}`;
}

export async function generateQRCodeBase64(text: string): Promise<string> {
  // Returns base64 string of the PNG
  const buffer = await QRCode.toBuffer(text);
  return buffer.toString('base64');
}
