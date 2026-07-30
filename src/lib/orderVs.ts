// Bank variable symbol derived from the order's creation date + its
// sequential order number, e.g. 26 Jul 2026, order #3 -> "2607300003".
// Purely derived (not stored) so both the checkout route and the admin
// orders page compute the exact same value from createdAt + orderNumber.
export function getOrderVs(createdAt: Date | string, orderNumber: number): string {
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  const datePart = `${String(d.getFullYear()).slice(-2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `${datePart}${String(orderNumber).padStart(4, "0")}`;
}
