"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import QuantityStepper from "@/components/quantity-stepper";
import Skeleton from "@/components/skeleton";
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
      <section className="flex-1 bg-black text-white px-4 pt-6 md:pt-10 pb-12" aria-hidden="true">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-4 w-24 mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            <Skeleton className="h-9 w-2/3 md:col-start-2 md:row-start-1" />

            <Skeleton className="aspect-square md:col-start-1 md:row-start-1 md:row-span-2" />

            <div className="flex flex-col gap-6 md:col-start-2 md:row-start-2">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-8 w-24" />
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-28" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-32" />
              </div>

              <Skeleton className="h-12 w-full sm:w-48" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (notFound || !product) {
    return (
      <section className="flex-1 bg-black text-white px-4 py-24 flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400 font-bold">{t("notFound")}</p>
        <Link href="/shop" className="underline text-white hover:text-gray-300">
          {t("backToShop")}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/shop"
          className="group inline-flex items-center gap-2 mb-8 text-sm font-medium uppercase tracking-wide text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          {t("backToShop")}
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <SectionHeading as="h1" align="left" className="md:col-start-2 md:row-start-1">
            {product.name}
          </SectionHeading>

          <div className="relative aspect-square bg-white border border-gray-700 rounded-sm overflow-hidden md:col-start-1 md:row-start-1 md:row-span-2">
            {selectedVariant?.image ? (
              <div key={selectedVariant.sku} className="fade-swap relative w-full h-full">
                <Image
                  src={selectedVariant.image}
                  alt={`${product.name} — ${selectedVariant.label}`}
                  fill
                  className="object-contain p-8 sm:p-12"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 italic">
                {product.name}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 md:col-start-2 md:row-start-2">
            <p className="text-gray-300 font-light leading-relaxed">{product.description}</p>

            {selectedVariant && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold uppercase tracking-wide text-gray-400">
                  {t("price")}
                </span>
                <span className="text-2xl font-bold text-white">
                  {formatPrice(selectedVariant.price)}
                </span>
              </div>
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

            <div className="flex flex-col gap-2">
              <label htmlFor="qty" className="text-sm font-bold uppercase tracking-wide text-gray-400">
                {t("quantity")}
              </label>
              <QuantityStepper
                id="qty"
                value={qty}
                onChange={setQty}
                min={1}
                max={selectedVariant?.quantity ?? 1}
              />
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedVariant || selectedVariant.quantity <= 0}
              className={`flex items-center justify-center gap-2 px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase shadow-xl border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-2xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                added
                  ? "bg-green-600 border-green-600 text-white"
                  : "bg-white border-white text-black hover:bg-gray-200"
              }`}
            >
              {added && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {added ? t("addedToCart") : t("addToCart")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
