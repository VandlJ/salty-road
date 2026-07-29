"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore } from "@/lib/cartStore";
import type { MerchProduct, MerchVariant } from "@/types/merch";

export default function ProductDetailPage() {
  const t = useTranslations("ShopPage");
  const params = useParams<{ slug: string }>();
  const addItem = useCartStore((state) => state.addItem);

  const [product, setProduct] = useState<MerchProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/merch/products/${params.slug}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error("Failed to load product");
        const data: MerchProduct = await res.json();
        setProduct(data);
        setSelectedSku(data.variants.find((v) => v.quantity > 0)?.sku ?? data.variants[0]?.sku ?? null);
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.slug]);

  const selectedVariant: MerchVariant | undefined = product?.variants.find(
    (v) => v.sku === selectedSku
  );

  function handleAddToCart() {
    if (!product || !selectedVariant) return;
    addItem({
      sku: selectedVariant.sku,
      productSlug: product.slug,
      name: product.name,
      variantLabel: selectedVariant.label,
      unitPrice: selectedVariant.price,
      qty,
      image: selectedVariant.image,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) {
    return (
      <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse">{t("loading")}</div>
      </section>
    );
  }

  if (notFound || !product) {
    return (
      <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12 flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400 font-bold">{t("notFound")}</p>
        <Link href="/shop" className="underline text-white hover:text-gray-300">
          {t("backToShop")}
        </Link>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/shop"
          className="inline-block mb-8 text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; {t("backToShop")}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="relative aspect-square bg-[#111] border border-gray-700 rounded-sm overflow-hidden">
            {selectedVariant?.image ? (
              <Image
                src={selectedVariant.image}
                alt={`${product.name} — ${selectedVariant.label}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-600 italic">
                {product.name}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <SectionHeading as="h1">{product.name}</SectionHeading>
            <p className="text-gray-300 font-light leading-relaxed">{product.description}</p>

            {selectedVariant && (
              <span className="text-2xl font-bold text-white">
                {formatPrice(selectedVariant.price)}
              </span>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase tracking-wide text-gray-400">
                {t("selectVariant")}
              </span>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const outOfStock = variant.quantity <= 0;
                  const isSelected = variant.sku === selectedSku;
                  return (
                    <button
                      key={variant.sku}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => setSelectedSku(variant.sku)}
                      className={`px-4 py-2 border-2 rounded-sm text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? "border-white bg-white text-black"
                          : "border-gray-500 text-white hover:border-white"
                      }`}
                    >
                      {variant.label}
                      {outOfStock && ` (${t("outOfStock")})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label htmlFor="qty" className="text-sm font-bold uppercase tracking-wide text-gray-400">
                {t("quantity")}
              </label>
              <input
                id="qty"
                type="number"
                min={1}
                max={selectedVariant?.quantity ?? 1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-2 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white"
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.quantity <= 0}
              className="px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase bg-white text-black shadow-xl border-2 border-white hover:bg-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {added ? t("addedToCart") : t("addToCart")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
