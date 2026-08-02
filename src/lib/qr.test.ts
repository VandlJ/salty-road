import { describe, it, expect } from "vitest";
import { generateSPD } from "@/lib/qr";

describe("generateSPD", () => {
  it("strips SPD field separators from the message", () => {
    // "*" opens a new SPD field — an unsanitised name could inject a second
    // AM (amount) field and change what the customer's bank app pays.
    const spd = generateSPD({ amount: 100, message: "Novak*AM:1.00", vs: "2608020001" });
    expect(spd).not.toContain("*AM:1.00");
    // Exactly one amount field must survive.
    expect(spd.match(/\*AM:/g)).toHaveLength(1);
  });

  it("strips newlines and plus signs", () => {
    const spd = generateSPD({ amount: 50, message: "a\r\nb+c" });
    expect(spd).toContain("MSG:abc");
  });

  it("truncates the message to 60 characters", () => {
    const spd = generateSPD({ amount: 50, message: "x".repeat(100) });
    expect(spd.split("MSG:")[1]).toHaveLength(60);
  });

  it("includes the X-VS field only when a variable symbol is given", () => {
    const withVs = generateSPD({ amount: 10, message: "x", vs: "2608020001" });
    expect(withVs).toContain("*X-VS:2608020001");

    const withoutVs = generateSPD({ amount: 10, message: "x" });
    expect(withoutVs).not.toContain("X-VS");
  });

  it("formats amount with two decimal places", () => {
    const spd = generateSPD({ amount: 145, message: "x" });
    expect(spd).toContain("AM:145.00");
  });

  it("throws when the bank account is not configured", () => {
    const original = process.env.BANK_ACCOUNT_IBAN;
    delete process.env.BANK_ACCOUNT_IBAN;
    expect(() => generateSPD({ amount: 1, message: "x" })).toThrow();
    process.env.BANK_ACCOUNT_IBAN = original;
  });
});
