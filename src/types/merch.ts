export type PhotoMode = "shared" | "per_variant";

export type MerchVariant = {
  id: string;
  sku: string;
  label: string;
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
  photoMode: PhotoMode;
  // Used only when photoMode is "shared" — same photos for every variant.
  photos: string[];
  sizeChartImage: string | null;
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
  address: string;
  items: OrderItem[];
  totalAmount: number; // halire
  paymentMethod: "bank_transfer" | "cod";
  status: "pending" | "paid" | "shipped" | "cancelled";
};

// Admin views include inactive products/variants and the active flag itself.
export type MerchVariantAdmin = MerchVariant & { active: boolean };

export type MerchProductAdmin = Omit<MerchProduct, "variants"> & {
  active: boolean;
  variants: MerchVariantAdmin[];
};
