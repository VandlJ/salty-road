// Flat shipping fee in halire (99 Kč). Shared between the checkout API
// (source of truth for the actual charge) and the checkout page (cosmetic
// preview only — the server always recomputes the real total).
export const SHIPPING_FEE = 9900;
