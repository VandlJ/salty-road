"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore, cartTotal } from "@/lib/cartStore";

export default function CartPage() {
  const t = useTranslations("ShopPage");
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);

  // Avoid a hydration mismatch: the server always renders an empty cart
  // (no access to localStorage), so only trust `items` once mounted.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const cartItems = mounted ? items : [];

  return (
    <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12">
      <div className="max-w-3xl mx-auto">
        <SectionHeading as="h1" size="lg" className="mb-12">
          {t("cart")}
        </SectionHeading>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <p className="text-gray-400 font-bold">{t("cartEmpty")}</p>
            <Link
              href="/shop"
              className="px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
            >
              {t("cartContinueShopping")}
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {cartItems.map((item) => (
                <div
                  key={item.sku}
                  className="flex items-center gap-4 bg-[#111] border border-gray-700 rounded-sm p-4"
                >
                  <div className="relative w-16 h-16 shrink-0 bg-black rounded-sm overflow-hidden border border-gray-700">
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.variantLabel}</div>
                    <div className="text-sm text-gray-300">{formatPrice(item.unitPrice)}</div>
                  </div>

                  <input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateQty(item.sku, Math.max(1, Number(e.target.value)))}
                    className="w-16 px-2 py-1 bg-white/5 text-white border-2 border-gray-500 rounded-sm text-center focus:outline-none focus:border-white"
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(item.sku)}
                    className="text-red-500 hover:text-red-400 text-sm font-bold uppercase tracking-wide cursor-pointer"
                  >
                    {t("cartRemove")}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-gray-700 pt-6">
              <span className="text-lg font-bold uppercase tracking-wide">{t("cartTotal")}</span>
              <span className="text-2xl font-bold">{formatPrice(cartTotal(cartItems))}</span>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between">
              <Link
                href="/shop"
                className="px-6 py-3 text-center border-2 border-gray-500 text-white rounded-sm hover:border-white transition-colors font-bold uppercase tracking-wide"
              >
                {t("cartContinueShopping")}
              </Link>
              <Link
                href="/shop/checkout"
                className="px-6 py-3 text-center bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
              >
                {t("cartCheckout")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
