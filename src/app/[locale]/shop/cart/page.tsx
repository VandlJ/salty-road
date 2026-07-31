"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import SectionHeading from "@/components/section-heading";
import QuantityStepper from "@/components/quantity-stepper";
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

  // CSS can only animate an *exit* if the row stays mounted while it plays
  // — so the real removeItem() call is delayed to match the .item-exit
  // animation duration (see globals.css) instead of firing immediately.
  const [removingSku, setRemovingSku] = useState<string | null>(null);

  function handleRemove(sku: string) {
    if (removingSku) return;
    setRemovingSku(sku);
    setTimeout(() => {
      const commit = () => {
        removeItem(sku);
        setRemovingSku(null);
      };
      // Native View Transitions API — makes the totals/checkout block below
      // glide up into the gap instead of snapping, by diffing the DOM
      // before/after this callback. flushSync forces the React state update
      // to commit synchronously inside it (startViewTransition needs the
      // DOM already updated when it captures the "after" snapshot).
      // Unsupported browsers (no startViewTransition) just get the old
      // instant update — no fallback branch needed beyond the guard below.
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        document.startViewTransition(() => flushSync(commit));
      } else {
        commit();
      }
    }, 250);
  }

  // Cart contents persist in localStorage across sessions, so stock may
  // have moved since items were added — re-check live availability so we
  // can warn/cap instead of letting checkout fail as a surprise.
  const [stockBySku, setStockBySku] = useState<Record<string, number>>({});
  const skusKey = cartItems.map((i) => i.sku).join(",");

  useEffect(() => {
    if (!skusKey) return;
    const skus = skusKey.split(",");
    fetch("/api/merch/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.stock && setStockBySku(data.stock))
      .catch((err) => console.error(err));
  }, [skusKey]);

  const hasStockIssue = cartItems.some(
    (item) => stockBySku[item.sku] !== undefined && item.qty > stockBySku[item.sku]
  );

  return (
    <section className="flex-1 bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-3xl mx-auto">
        <SectionHeading as="h1" size="lg" className="mb-8 md:mb-12">
          {t("cart")}
        </SectionHeading>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center gap-6 text-center py-20 border border-dashed border-gray-800 rounded-sm">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-600"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="19" cy="21" r="1" />
              <path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.6L21.5 8H6" />
            </svg>
            <p className="text-gray-400 font-light text-base">{t("cartEmpty")}</p>
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
              {cartItems.map((item) => {
                const available = stockBySku[item.sku];
                const exceedsStock = available !== undefined && item.qty > available;

                return (
                  <div
                    key={item.sku}
                    className={`flex flex-wrap items-center gap-3 sm:gap-4 bg-[#111] border rounded-sm p-3 sm:p-4 ${
                      exceedsStock ? "border-red-600" : "border-gray-700"
                    } ${removingSku === item.sku ? "item-exit" : ""}`}
                  >
                    <Link
                      href={`/shop/${item.productSlug}`}
                      className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[140px] no-underline group"
                    >
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-black rounded-sm overflow-hidden border border-gray-700">
                        {item.image ? (
                          <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                        ) : null}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate group-hover:underline">{item.name}</div>
                        <div className="text-sm text-gray-400">{item.variantLabel}</div>
                        <div className="text-sm text-gray-300">{formatPrice(item.unitPrice)}</div>
                        {exceedsStock && (
                          <div className="text-sm text-red-500 font-bold mt-1">
                            {available > 0
                              ? t("stockLimited", { count: available })
                              : t("stockUnavailable")}
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                      <QuantityStepper
                        value={item.qty}
                        onChange={(next) => updateQty(item.sku, next)}
                        min={1}
                        max={available}
                      />

                      <button
                        type="button"
                        onClick={() => handleRemove(item.sku)}
                        className="text-red-500 hover:text-red-400 text-xs sm:text-sm font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap"
                      >
                        {t("cartRemove")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="vt-cart-summary">
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
                {hasStockIssue ? (
                  <span
                    aria-disabled="true"
                    className="px-6 py-3 text-center bg-white/30 text-black/50 rounded-sm border-2 border-white/30 font-bold uppercase tracking-wide cursor-not-allowed"
                  >
                    {t("cartCheckout")}
                  </span>
                ) : (
                  <Link
                    href="/shop/checkout"
                    className="px-6 py-3 text-center bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
                  >
                    {t("cartCheckout")}
                  </Link>
                )}
              </div>

              {hasStockIssue && (
                <p className="mt-3 text-sm text-red-500 text-center sm:text-right">
                  {t("stockIssueBlockingCheckout")}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
