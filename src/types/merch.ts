export type MerchVariant = {
  id: string;
  sku: string;
  label: string;
  price: number; // halire
  quantity: number;
  image: string | null;
};

export type MerchProduct = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
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

export type MerchProductAdmin = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  active: boolean;
  variants: MerchVariantAdmin[];
};
