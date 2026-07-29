"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";
import type { MerchProduct } from "@/types/merch";

export default function ShopPage() {
  const t = useTranslations("ShopPage");
  const [products, setProducts] = useState<MerchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/merch/products");
        if (!res.ok) throw new Error("Failed to load products");
        const data: MerchProduct[] = await res.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError(t("errorLoad"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t]);

  return (
    <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-16 gap-4 text-center">
          <SectionHeading as="h1" size="lg">
            {t("title")}
          </SectionHeading>
          <p className="text-gray-300 font-light max-w-xl">{t("subtitle")}</p>
        </div>

        {loading && (
          <div className="text-center text-white font-bold animate-pulse">{t("loading")}</div>
        )}
        {error && (
          <div className="text-white mb-6 p-4 border-2 border-red-500 bg-red-600/50 rounded-sm font-bold text-center">
            {error}
          </div>
        )}
        {!loading && !error && products.length === 0 && (
          <div className="text-center text-gray-500 font-bold">{t("noProducts")}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const minPrice = Math.min(...product.variants.map((v) => v.price));
            const thumbnail = product.variants.find((v) => v.image)?.image;
            const inStock = product.variants.some((v) => v.quantity > 0);

            return (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group relative aspect-square bg-[#111] border border-gray-600 overflow-hidden hover:border-white transition-all duration-300 shadow-xl rounded-sm block"
              >
                {thumbnail ? (
                  <Image
                    src={thumbnail}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-600 italic text-sm">
                    {product.name}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />

                {!inStock && (
                  <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 border border-white/20 text-[10px] uppercase tracking-widest text-white font-bold rounded-sm">
                    {t("outOfStock")}
                  </span>
                )}

                <div className="absolute inset-0 p-4 flex flex-col justify-end">
                  <h2 className="text-lg font-bold text-white drop-shadow-2xl">{product.name}</h2>
                  <span className="text-sm text-gray-300 font-medium">
                    {t("priceFrom", { price: formatPrice(minPrice) })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
