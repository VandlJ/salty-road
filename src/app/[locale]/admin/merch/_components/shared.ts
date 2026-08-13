import type { useTranslations } from "next-intl";
import type { MerchVariantAdmin } from "@/types/merch";
import { compareBySize } from "@/lib/variantLabel";
import { MERCH_CATEGORY_SUGGESTIONS } from "@/lib/constants";

export const ERROR_KEY_MAP = {
  missing_fields: "errorMissingFields",
  field_too_long: "errorFieldTooLong",
  invalid_slug: "errorInvalidSlug",
  slug_taken: "errorSlugTaken",
  sku_taken: "errorSkuTaken",
  invalid_price: "errorInvalidPrice",
  invalid_quantity: "errorInvalidQuantity",
} as const;

export type Translate = ReturnType<typeof useTranslations<"AdminMerchPage">>;

export type ColorGroup = { color: string; order: number; variants: MerchVariantAdmin[] };

export function groupVariantsByColor(variants: MerchVariantAdmin[]): ColorGroup[] {
  const map = new Map<string, MerchVariantAdmin[]>();
  for (const v of variants) {
    const key = v.color ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(v);
  }
  const groups = Array.from(map.entries()).map(([color, vs]) => ({
    color,
    // All variants in a group are kept on the same `order` value by the
    // reorder/create endpoints, but fall back to the min just in case two
    // rows ever drift out of sync.
    order: Math.min(...vs.map((v) => v.order)),
    variants: [...vs].sort(compareBySize),
  }));
  groups.sort((a, b) => a.order - b.order);
  return groups;
}

export const CATEGORY_OPTIONS = MERCH_CATEGORY_SUGGESTIONS;
// No `Record<..., string>` annotation on purpose — that widens the values to
// `string` and next-intl can then no longer check them as message keys.
export const CATEGORY_LABEL_KEY = {
  hoodie: "categoryHoodie",
  tshirt: "categoryTshirt",
  "car-scent": "categoryCarScent",
  cap: "categoryCap",
} as const;
