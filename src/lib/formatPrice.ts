// Prices are stored in halire (1/100 CZK) to avoid floating point rounding
// issues, matching the existing registration fee handling.
export function formatPrice(halire: number): string {
  const czk = halire / 100;
  return `${czk.toLocaleString("cs-CZ")} Kč`;
}
