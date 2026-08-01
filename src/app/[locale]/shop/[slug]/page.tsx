import { notFound } from "next/navigation";
import { getShopProduct } from "@/lib/shopProduct";
import { getAdminFromReq } from "@/lib/adminAuth";
import type { MerchProduct, PhotoMode } from "@/types/merch";
import ProductDetailClient from "./product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getShopProduct(slug);

  if (!product) notFound();

  // Not live to the public — only an authenticated admin previewing an
  // unreleased/paused product gets to see it anyway (see the
  // "previewOnlyBanner" in ProductDetailClient). A gift-only product isn't
  // separately purchasable yet, so it's treated the same as inactive here.
  const isLive = product.active && !product.giftOnly && product.variants.length > 0;
  if (!isLive) {
    const admin = await getAdminFromReq();
    if (!admin) notFound();
  }

  const productData: MerchProduct = {
    id: product.id,
    slug: product.slug,
    category: product.category,
    name: product.name,
    description: product.description,
    active: product.active,
    giftOnly: product.giftOnly,
    photoMode: product.photoMode as PhotoMode,
    photos: product.photos,
    sizeChartImage: product.sizeChartImage,
    order: product.order,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      order: v.order,
      price: v.price,
      quantity: v.quantity,
      images: v.images,
    })),
  };

  return <ProductDetailClient product={productData} />;
}
