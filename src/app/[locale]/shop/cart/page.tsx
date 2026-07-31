"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import SectionHeading from "@/components/section-heading";
import QuantityStepper from "@/components/quantity-stepper";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore, cartTotal } from "@/lib/cartStore";

export default function CartPage() {
  const t = useTranslations("ShopPage");
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQty = useCartStore((state) => state.updateQty);
  const storedCouponCode = useCartStore((state) => state.couponCode);
  const setCoupon = useCartStore((state) => state.setCoupon);

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

  // Coupon: input + server-validated preview. Only the code persists across
  // navigation (cartStore) — the discount amount is always re-derived from a
  // fresh validate call, never trusted from storage, and checkout
  // re-validates again server-side regardless.
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const subtotal = cartTotal(cartItems);

  async function validateCoupon(code: string) {
    if (!code.trim() || subtotal === 0) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/merch/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          items: cartItems.map((i) => ({ sku: i.sku, qty: i.qty })),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setCouponError(json?.error === "coupon_not_applicable" ? t("couponNotApplicable") : t("couponInvalid"));
        setCouponPreview(null);
        setCoupon(null);
        return;
      }
      const json = await res.json();
      setCouponPreview({ code: json.code, discountAmount: json.discountAmount });
      setCoupon(json.code);
    } catch (err) {
      console.error(err);
      setCouponError(t("couponInvalid"));
    } finally {
      setCouponChecking(false);
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponPreview(null);
    setCouponInput("");
    setCouponError(null);
  }

  // Re-validate a coupon carried over from a previous visit (cart contents
  // may have changed since, changing the discount amount or invalidating it
  // entirely) — but only once mounted+hydrated, and only if nothing has
  // been typed into the input yet this session.
  useEffect(() => {
    if (mounted && storedCouponCode && !couponPreview && !couponInput) {
      setCouponInput(storedCouponCode);
      validateCoupon(storedCouponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, storedCouponCode]);

  const discountAmount = couponPreview?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

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
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    placeholder={t("couponPlaceholder")}
                    disabled={!!couponPreview}
                    className="flex-1 px-4 py-2.5 bg-white/5 text-white placeholder-gray-500 border-2 border-gray-600 rounded-sm focus:outline-none focus:border-white transition-colors text-sm disabled:opacity-50 uppercase"
                  />
                  <AnimatePresence mode="wait" initial={false}>
                  {couponPreview ? (
                    <motion.button
                      key="remove"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      type="button"
                      onClick={removeCoupon}
                      className="px-4 py-2.5 border-2 border-gray-500 text-gray-300 rounded-sm hover:border-white hover:text-white transition-colors font-bold uppercase tracking-wide text-sm cursor-pointer"
                    >
                      {t("couponRemove")}
                    </motion.button>
                  ) : (
                    <motion.button
                      key="apply"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      type="button"
                      onClick={() => validateCoupon(couponInput)}
                      disabled={couponChecking || !couponInput.trim()}
                      className="px-4 py-2.5 border-2 border-white text-white rounded-sm hover:bg-white hover:text-black transition-colors font-bold uppercase tracking-wide text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {couponChecking ? t("couponChecking") : t("couponApply")}
                    </motion.button>
                  )}
                  </AnimatePresence>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                {couponError ? (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-red-500 text-sm font-bold mt-2"
                  >
                    {couponError}
                  </motion.p>
                ) : couponPreview ? (
                  <motion.p
                    key="applied"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-green-500 text-sm font-bold mt-2"
                  >
                    {t("couponApplied", { code: couponPreview.code })}
                  </motion.p>
                ) : null}
                </AnimatePresence>
              </div>

              <div className="mt-6 flex flex-col gap-1">
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-gray-400 text-sm">
                    <span>{t("couponDiscount")}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold uppercase tracking-wide">{t("cartTotal")}</span>
                  <span className="text-2xl font-bold">{formatPrice(finalTotal)}</span>
                </div>
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

              <AnimatePresence>
              {hasStockIssue && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 text-sm text-red-500 text-center sm:text-right overflow-hidden"
                >
                  {t("stockIssueBlockingCheckout")}
                </motion.p>
              )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
