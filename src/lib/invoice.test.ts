import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateInvoicePdf, type InvoiceOrder } from "@/lib/invoice";

// 263 lines of money-handling PDF generation that had no tests at all.
//
// pdf-lib emits compressed content streams, so the rendered text isn't
// greppable in the output. These assert what can be checked without a PDF
// parser: that every branch produces a valid document rather than throwing,
// which is what actually broke invoices before (a null address on a pickup
// order, a missing IBAN, an order with a gift or a discount).

const baseOrder: InvoiceOrder = {
  orderNumber: 17,
  createdAt: new Date("2026-08-11T10:00:00.000Z"),
  customerName: "Jan Novák",
  customerEmail: "jan@example.cz",
  customerPhone: "+420 777 123 456",
  address: "Ukázková 1, 301 00 Plzeň",
  items: [
    { name: "Tričko Unisex", label: "M / Černá", price: 65000, qty: 1 },
    { name: "Voňavka", label: "Broskvička", price: 6900, qty: 2 },
  ],
  totalAmount: 88700,
  shippingFee: 9900,
  couponCode: null,
  discountAmount: 0,
  giftLabel: null,
};

const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString("latin1") === "%PDF-";

describe("generateInvoicePdf", () => {
  it("produces a valid PDF for an ordinary order", async () => {
    const pdf = await generateInvoicePdf(baseOrder);
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(isPdf(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("handles a pickup order with no address", async () => {
    // address is null for pickup — the layout shifts rows up rather than
    // rendering an empty line, which is easy to get wrong.
    const pdf = await generateInvoicePdf({ ...baseOrder, address: null, shippingFee: 0 });
    expect(isPdf(pdf)).toBe(true);
  });

  it("handles a discounted order", async () => {
    const pdf = await generateInvoicePdf({
      ...baseOrder,
      couponCode: "SALTYVOL1",
      discountAmount: 6500,
      totalAmount: 82200,
    });
    expect(isPdf(pdf)).toBe(true);
  });

  it("handles an order carrying a free gift", async () => {
    const pdf = await generateInvoicePdf({ ...baseOrder, giftLabel: "Samolepka" });
    expect(isPdf(pdf)).toBe(true);
  });

  it("handles a single-item order and a long multi-item one", async () => {
    const one = await generateInvoicePdf({ ...baseOrder, items: [baseOrder.items[0]] });
    expect(isPdf(one)).toBe(true);

    const many = await generateInvoicePdf({
      ...baseOrder,
      items: Array.from({ length: 20 }, (_, i) => ({
        name: `Produkt ${i + 1}`,
        label: "M / Černá",
        price: 65000,
        qty: 1,
      })),
    });
    expect(isPdf(many)).toBe(true);
  });

  it("renders Czech diacritics without throwing", async () => {
    // The invoice embeds its own font precisely because the built-in PDF
    // fonts can't encode ř/ž/ě — a regression here throws at encode time.
    const pdf = await generateInvoicePdf({
      ...baseOrder,
      customerName: "Řehoř Žluťoučký",
      address: "Příkrá 5, Č. Budějovice",
      items: [{ name: "Mikina černá", label: "XL / Šedá", price: 145000, qty: 1 }],
    });
    expect(isPdf(pdf)).toBe(true);
  });
});

describe("generateInvoicePdf without BANK_ACCOUNT_IBAN", () => {
  const original = process.env.BANK_ACCOUNT_IBAN;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.BANK_ACCOUNT_IBAN;
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    warn.mockRestore();
    if (original === undefined) delete process.env.BANK_ACCOUNT_IBAN;
    else process.env.BANK_ACCOUNT_IBAN = original;
  });

  it("still issues the invoice, but says so", async () => {
    // generateSPD throws in this case because a QR with no account is
    // useless; the invoice is generated after payment, so it degrades
    // instead — but silently doing that shipped a tax document with no
    // bank account and no trace.
    const pdf = await generateInvoicePdf(baseOrder);
    expect(isPdf(pdf)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("BANK_ACCOUNT_IBAN");
  });
});
