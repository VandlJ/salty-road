import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { getOrderVs } from "@/lib/orderVs";

// Base-14 PDF fonts (Helvetica etc.) can't encode Czech diacritics (č š ž ř
// ď ť ň ů fall outside WinAnsi/cp1252) — Roboto (Apache 2.0, LICENSE-Roboto.txt
// in this dir) has full Latin Extended-A coverage, so it's embedded instead.
// Must be the unmodified upstream .ttf — re-saving through fontTools (e.g.
// to convert from .woff) corrupts the glyph/cmap data pdf-lib's fontkit
// relies on and silently renders most characters as the wrong glyph.
const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");

// Same wordmark font as the site navbar (see .font-amika in globals.css).
const AMIKA_PATH = path.join(process.cwd(), "src/app/fonts/Amika_Blackletter.ttf");

// Downscaled copy of public/Logo/SRM_logo-1.png (2520x3308 originally) —
// the invoice only ever renders it a few dozen points tall, so a 300px-tall
// copy keeps the PDF (and the e-mail attachment built from it) small.
const LOGO_PATH = path.join(process.cwd(), "src/assets/invoice-logo.png");

// Seller identification — same entity as declared on /cs/shop/terms. Not a
// VAT payer, so no DIČ / tax breakdown is required on the invoice.
const SELLER = {
  tradeName: "Salty Road",
  name: "David Šmídmajer",
  ico: "22171347",
  address: "Mírová 1013, Prachatice, 383 01",
  email: "shop@saltyroad.cz",
};

const ACCENT = rgb(0.78, 0.11, 0.14); // brand red, matches site CTA red

interface InvoiceItem {
  name: string;
  label: string;
  price: number; // halire, per unit
  qty: number;
}

export interface InvoiceOrder {
  orderNumber: number;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  address: string | null;
  items: InvoiceItem[];
  totalAmount: number; // halire
  shippingFee: number; // halire
  couponCode: string | null;
  discountAmount: number; // halire
  giftLabel: string | null;
}

function formatHalire(halire: number): string {
  return `${(halire / 100).toLocaleString("cs-CZ")} Kč`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("cs-CZ", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export async function generateInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const pageWidth = 595.28;
  const pageHeight = 841.89; // A4
  const page = doc.addPage([pageWidth, pageHeight]);
  const font = await doc.embedFont(fs.readFileSync(path.join(FONTS_DIR, "Roboto-Regular.ttf")));
  const bold = await doc.embedFont(fs.readFileSync(path.join(FONTS_DIR, "Roboto-Bold.ttf")));
  const amika = await doc.embedFont(fs.readFileSync(AMIKA_PATH));

  const invoiceNumber = getOrderVs(order.createdAt, order.orderNumber);

  doc.setTitle(`Faktura ${invoiceNumber} — Salty Road`);
  doc.setAuthor("Salty Road");
  doc.setCreator("Salty Road Shop");
  doc.setProducer("Salty Road Shop");

  const marginX = 50;
  const contentRight = pageWidth - marginX;
  let y = pageHeight - 56;
  const black = rgb(0.08, 0.08, 0.08);
  const gray = rgb(0.45, 0.45, 0.45);
  const lightGray = rgb(0.93, 0.93, 0.93);

  function text(
    value: string,
    x: number,
    yPos: number,
    opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}
  ) {
    page.drawText(value, {
      x,
      y: yPos,
      size: opts.size ?? 10,
      font: opts.f ?? font,
      color: opts.color ?? black,
    });
  }

  function textRight(
    value: string,
    xRight: number,
    yPos: number,
    opts: { size?: number; f?: typeof font; color?: ReturnType<typeof rgb> } = {}
  ) {
    const f = opts.f ?? font;
    const size = opts.size ?? 10;
    const width = f.widthOfTextAtSize(value, size);
    text(value, xRight - width, yPos, opts);
  }

  // Header: logo mark + wordmark on the left, invoice title on the right.
  const logoBytes = fs.readFileSync(LOGO_PATH);
  const logoImage = await doc.embedPng(logoBytes);
  const logoHeight = 54;
  const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
  page.drawImage(logoImage, { x: marginX, y: y - logoHeight, width: logoWidth, height: logoHeight });
  text("Salty Road", marginX + logoWidth + 12, y - logoHeight / 2 - 6, {
    size: 20,
    f: amika,
    color: black,
  });

  textRight("FAKTURA", contentRight, y, { size: 20, f: bold });
  textRight(`č. ${invoiceNumber}`, contentRight, y - 18, { size: 11, color: gray });
  y -= logoHeight + 6;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: contentRight, y },
    thickness: 2,
    color: ACCENT,
  });
  y -= 34;

  // Seller / buyer columns
  const colY = y;
  const rightX = 320;
  text("DODAVATEL", marginX, colY, { size: 8, f: bold, color: gray });
  text(SELLER.tradeName, marginX, colY - 16, { f: bold, size: 11 });
  text(SELLER.name, marginX, colY - 30);
  text(`IČO: ${SELLER.ico}`, marginX, colY - 44);
  text(SELLER.address, marginX, colY - 58);
  text(SELLER.email, marginX, colY - 72);
  text("Nejsme plátci DPH", marginX, colY - 86, { color: gray, size: 9 });

  text("ODBĚRATEL", rightX, colY, { size: 8, f: bold, color: gray });
  text(order.customerName, rightX, colY - 16, { f: bold, size: 11 });
  const buyerAddrY = order.address ? colY - 30 : null;
  if (buyerAddrY) text(order.address as string, rightX, buyerAddrY);
  text(order.customerEmail, rightX, buyerAddrY ? buyerAddrY - 14 : colY - 30);

  y -= 116;

  const iban = process.env.BANK_ACCOUNT_IBAN;
  const metaRows: [string, string][] = [
    ["Datum vystavení", formatDate(order.createdAt)],
    ["Datum úhrady", formatDate(new Date())],
    ["Způsob platby", "Bankovní převod"],
    ...(iban ? ([["Účet (IBAN)", iban]] as [string, string][]) : []),
  ];
  page.drawRectangle({
    x: marginX,
    y: y - metaRows.length * 15 - 10,
    width: contentRight - marginX,
    height: metaRows.length * 15 + 20,
    color: lightGray,
  });
  y -= 8;
  for (const [label, value] of metaRows) {
    text(label, marginX + 12, y - 10, { size: 9, color: gray });
    text(value, marginX + 160, y - 10, { size: 9, f: bold });
    y -= 15;
  }
  y -= 26;

  // Items table header
  const colQty = 350;
  const colUnit = 410;
  const colTotal = contentRight;
  page.drawRectangle({
    x: marginX,
    y: y - 8,
    width: contentRight - marginX,
    height: 22,
    color: black,
  });
  text("POLOŽKA", marginX + 10, y - 2, { f: bold, size: 8, color: rgb(1, 1, 1) });
  textRight("MNOŽ.", colQty, y - 2, { f: bold, size: 8, color: rgb(1, 1, 1) });
  textRight("CENA/KS", colUnit, y - 2, { f: bold, size: 8, color: rgb(1, 1, 1) });
  textRight("CELKEM", colTotal - 10, y - 2, { f: bold, size: 8, color: rgb(1, 1, 1) });
  y -= 30;

  function row(label: string, qty: string | null, unit: string | null, total: string, opts: { color?: ReturnType<typeof rgb>; f?: typeof font } = {}) {
    text(label, marginX + 10, y, { size: 10, ...opts });
    if (qty) textRight(qty, colQty, y, { size: 10, ...opts });
    if (unit) textRight(unit, colUnit, y, { size: 10, ...opts });
    textRight(total, colTotal - 10, y, { size: 10, ...opts });
    y -= 20;
  }

  for (const item of order.items) {
    const label = item.label ? `${item.name} (${item.label})` : item.name;
    row(label, String(item.qty), formatHalire(item.price), formatHalire(item.price * item.qty));
  }

  if (order.giftLabel) {
    row(`Dárek zdarma: ${order.giftLabel}`, null, null, formatHalire(0), { color: gray });
  }

  if (order.couponCode && order.discountAmount > 0) {
    row(`Kupón ${order.couponCode}`, null, null, `-${formatHalire(order.discountAmount)}`);
  }

  row("Poštovné", null, null, order.shippingFee > 0 ? formatHalire(order.shippingFee) : "zdarma");

  y -= 4;
  page.drawLine({ start: { x: marginX, y }, end: { x: contentRight, y }, thickness: 0.75, color: gray });
  y -= 30;

  page.drawRectangle({
    x: marginX,
    y: y - 10,
    width: contentRight - marginX,
    height: 30,
    color: lightGray,
  });
  text("CELKEM K ÚHRADĚ", marginX + 10, y, { f: bold, size: 12 });
  textRight(formatHalire(order.totalAmount), colTotal - 10, y, { f: bold, size: 14, color: ACCENT });

  text(
    "Děkujeme za nákup u Salty Road.",
    marginX,
    60,
    { size: 9, color: gray }
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
