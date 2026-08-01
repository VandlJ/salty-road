// Fixed size ladder — sizes always sort by this order regardless of the
// admin-controlled color-group order (MerchVariant.order). Unknown/custom
// size strings (not in this list) sort after every known size, alphabetically
// among themselves, so a typo or one-off size doesn't crash sorting.
export const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "4XL"];

export function sizeRank(size: string | null | undefined): number {
  if (!size) return -1;
  const idx = SIZE_ORDER.indexOf(size.toUpperCase());
  return idx === -1 ? 1000 : idx;
}

export function compareBySize(a: { size?: string | null }, b: { size?: string | null }): number {
  const rankDiff = sizeRank(a.size) - sizeRank(b.size);
  if (rankDiff !== 0) return rankDiff;
  return (a.size ?? "").localeCompare(b.size ?? "");
}

// Display order: color group first (MerchVariant.order — manually set via
// admin arrows, shared across every variant with the same color), then size
// within that color, automatically via the fixed ladder above.
export function compareVariantsForDisplay(
  a: { order: number; size?: string | null },
  b: { order: number; size?: string | null }
): number {
  return a.order - b.order || compareBySize(a, b);
}

export function variantLabel(v: { size?: string | null; color?: string | null }): string {
  const size = v.size?.trim();
  const color = v.color?.trim();
  if (size && color) return `${size} / ${color}`;
  if (size) return size;
  if (color) return color;
  return "";
}
