export type PhotoMode = "shared" | "per_variant";

export type MerchVariant = {
  id: string;
  sku: string;
  // Structured size/color instead of a free-text label — sizes sort via a
  // fixed ladder (see SIZE_ORDER in @/lib/variantLabel), colors via `order`
  // below (admin-controlled, shared across every variant of that color).
  // Either can be null for a product with no size or no color dimension.
  color: string | null;
  size: string | null;
  order: number;
  price: number; // halire
  quantity: number;
  // Used only when the parent product's photoMode is "per_variant".
  images: string[];
};

export type MerchProduct = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  // Only meaningful when this product was fetched via the admin-preview
  // bypass (see /api/merch/products/[slug]) — the public listing/detail
  // flow never surfaces inactive products at all, so this is always `true`
  // there. Optional so existing call sites that don't care don't need it.
  active?: boolean;
  // Same admin-preview-only meaning as `active` above.
  sellable?: boolean;
  photoMode: PhotoMode;
  // Used only when photoMode is "shared" — same photos for every variant.
  photos: string[];
  sizeChartImage: string | null;
  order: number;
  variants: MerchVariant[];
};

export type OrderItem = {
  sku: string;
  name: string;
  label: string;
  price: number; // halire
  qty: number;
};

export type Order = {
  id: string;
  orderNumber: number;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string | null;
  items: OrderItem[];
  totalAmount: number; // halire
  paymentMethod: "bank_transfer" | "cod";
  deliveryMethod: "shipping" | "pickup";
  shippingFee: number; // halire
  status: "pending" | "paid" | "shipped" | "cancelled";
  couponCode: string | null;
  discountAmount: number; // halire
  couponFreeShipping: boolean;
  giftProductId: string | null;
  giftVariantSku: string | null;
  giftLabel: string | null;
};

export type ContactMessage = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
};

export type StockRequest = {
  id: string;
  createdAt: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  customerName: string;
  customerEmail: string;
  fulfilled: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  categories: string[];
  createdAt: string;
};

// Admin views include inactive products/variants and the active flag itself.
export type MerchVariantAdmin = MerchVariant & { active: boolean };

export type MerchProductAdmin = Omit<MerchProduct, "variants"> & {
  active: boolean;
  sellable: boolean;
  giftEligible: boolean;
  variants: MerchVariantAdmin[];
};
