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
  const storedShippingCouponCode = useCartStore((state) => state.shippingCouponCode);
  const setShippingCoupon = useCartStore((state) => state.setShippingCoupon);
  const giftSku = useCartStore((state) => state.giftSku);
  const setGift = useCartStore((state) => state.setGift);

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
  const [shippingCouponPreview, setShippingCouponPreview] = useState<{ code: string } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const subtotal = cartTotal(cartItems);

  // A validated code lands in whichever slot matches its real `type` — a
  // discount coupon (percent/fixed) and a free_shipping coupon can both be
  // active at once, so this never clears the other slot.
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
        return;
      }
      const json = await res.json();
      if (json.freeShipping) {
        setShippingCouponPreview({ code: json.code });
        setShippingCoupon(json.code);
      } else {
        setCouponPreview({ code: json.code, discountAmount: json.discountAmount });
        setCoupon(json.code);
      }
      setCouponInput("");
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
    setCouponError(null);
  }

  function removeShippingCoupon() {
    setShippingCoupon(null);
    setShippingCouponPreview(null);
    setCouponError(null);
  }

  // Re-validate coupons carried over from a previous visit (cart contents
  // may have changed since, changing the discount amount or invalidating it
  // entirely) — but only once mounted+hydrated.
  useEffect(() => {
    if (mounted && storedCouponCode && !couponPreview) {
      // Re-validating a coupon carried over from a previous visit, not a
      // render-cascade loop — guarded above so it only fires once per code.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateCoupon(storedCouponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, storedCouponCode]);

  useEffect(() => {
    if (mounted && storedShippingCouponCode && !shippingCouponPreview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateCoupon(storedShippingCouponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, storedShippingCouponCode]);

  const discountAmount = couponPreview?.discountAmount ?? 0;

  // Preview-only "Poštovné" line — assumes shipping delivery (pickup is
  // always free but the cart doesn't know the checkout choice yet); the
  // checkout page recomputes this for real once a delivery method is picked.
  // Fetched together with the gift threshold below, one shop-status call.
  const [shippingFeePreview, setShippingFeePreview] = useState(0);
  const [giftThreshold, setGiftThreshold] = useState(0);
  useEffect(() => {
    fetch("/api/shop-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setShippingFeePreview(data.shippingFeeHalire ?? 0);
        setGiftThreshold(data.stickerGiftThresholdHalire ?? 0);
      })
      .catch((err) => console.error(err));
  }, []);

  const shippingFee = shippingCouponPreview ? 0 : shippingFeePreview;
  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

  const giftEligible = giftThreshold > 0 && finalTotal >= giftThreshold;

  type GiftOption = { sku: string; productId: string; name: string; description: string; image: string | null };
  const [giftOptions, setGiftOptions] = useState<GiftOption[]>([]);
  // Fetched as soon as the feature is configured (not just once eligible) —
  // needed to know whether to show the "X Kč to go" progress bar at all
  // (no point teasing a gift that has no stock left).
  useEffect(() => {
    if (giftThreshold <= 0) return;
    fetch("/api/merch/gift-options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Array.isArray(data) && setGiftOptions(data))
      .catch((err) => console.error(err));
  }, [giftThreshold]);

  const giftRemaining = Math.max(0, giftThreshold - finalTotal);
  const giftProgressPct = giftThreshold > 0 ? Math.min(100, (finalTotal / giftThreshold) * 100) : 0;

  // Drop the selection the moment it's no longer valid — below threshold,
  // or the previously-picked sku sold out / stopped being offered. Checkout
  // re-validates server-side regardless, this is just so the UI doesn't
  // silently submit a stale choice.
  useEffect(() => {
    if (!giftEligible && giftSku) {
      setGift(null);
      return;
    }
    if (giftEligible && giftSku && giftOptions.length > 0 && !giftOptions.some((o) => o.sku === giftSku)) {
      setGift(null);
    }
  }, [giftEligible, giftSku, giftOptions, setGift]);

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
                    data-testid="cart-item"
                    data-sku={item.sku}
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
                        max={available ?? item.qty}
                      />

                      <button
                        type="button"
                        data-testid="cart-item-remove"
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

            {giftThreshold > 0 && giftOptions.length > 0 && !giftEligible && (
              <div className="mt-6 p-4 border border-gray-700 rounded-sm bg-white/[0.02]">
                <p className="text-sm text-gray-300 mb-2">
                  {t("giftProgress", { amount: formatPrice(giftRemaining) })}
                </p>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-brand"
                    initial={false}
                    animate={{ width: `${giftProgressPct}%` }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            )}

            <div className="vt-cart-summary">
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    data-testid="coupon-input"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    placeholder={t("couponPlaceholder")}
                    className="flex-1 px-4 py-2.5 bg-white/5 text-white placeholder-gray-500 border-2 border-gray-600 rounded-sm focus:outline-none focus:border-white transition-colors text-sm uppercase"
                  />
                  <button
                    type="button"
                    data-testid="coupon-apply"
                    onClick={() => validateCoupon(couponInput)}
                    disabled={couponChecking || !couponInput.trim()}
                    className="px-4 py-2.5 border-2 border-white text-white rounded-sm hover:bg-white hover:text-black transition-colors font-bold uppercase tracking-wide text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {couponChecking ? t("couponChecking") : t("couponApply")}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                {couponError && (
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
                )}
                </AnimatePresence>

                <div className="flex flex-col gap-2 mt-3">
                  <AnimatePresence initial={false}>
                  {couponPreview && (
                    <motion.div
                      key="discount-chip"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-2 border-green-600/50 bg-green-600/10 rounded-sm"
                    >
                      <span className="text-green-500 text-sm font-bold">
                        {t("couponApplied", { code: couponPreview.code })}
                      </span>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer shrink-0"
                      >
                        {t("couponRemove")}
                      </button>
                    </motion.div>
                  )}
                  {shippingCouponPreview && (
                    <motion.div
                      key="shipping-chip"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between gap-3 px-3 py-2 border-2 border-green-600/50 bg-green-600/10 rounded-sm"
                    >
                      <span className="text-green-500 text-sm font-bold">
                        {t("couponAppliedFreeShipping", { code: shippingCouponPreview.code })}
                      </span>
                      <button
                        type="button"
                        onClick={removeShippingCoupon}
                        className="text-gray-400 hover:text-white text-xs font-bold uppercase tracking-wide cursor-pointer shrink-0"
                      >
                        {t("couponRemove")}
                      </button>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
              {giftEligible && giftOptions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 pt-6 border-t border-gray-700 overflow-hidden"
                >
                  <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-1">
                    {t("giftSectionTitle")}
                  </h2>
                  <p className="text-gray-400 text-sm mb-4">{t("giftSectionSubtitle")}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {giftOptions.map((opt) => {
                      const selected = giftSku === opt.sku;
                      return (
                        <button
                          key={opt.sku}
                          type="button"
                          data-testid="gift-option"
                          data-sku={opt.sku}
                          onClick={() => setGift(selected ? null : opt.sku)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-sm border-2 transition-colors cursor-pointer text-center ${
                            selected ? "border-white bg-white/10" : "border-gray-700 hover:border-gray-500"
                          }`}
                        >
                          <div className="relative w-16 h-16 shrink-0 bg-black rounded-sm overflow-hidden border border-gray-700">
                            {opt.image ? (
                              <Image src={opt.image} alt={opt.name} fill className="object-cover" sizes="64px" />
                            ) : null}
                          </div>
                          <span className="text-xs font-bold text-white leading-tight">{opt.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              <div className="mt-6 flex flex-col gap-1">
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between text-gray-400 text-sm">
                    <span>{t("couponDiscount")}</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                {shippingFeePreview > 0 && (
                  <div className="flex items-center justify-between text-gray-400 text-sm">
                    <span>{t("checkoutShippingFee")}</span>
                    <span>{shippingFee > 0 ? formatPrice(shippingFee) : t("checkoutShippingFree")}</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-0.5">{t("cartShippingEstimateNote")}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold uppercase tracking-wide">{t("cartTotal")}</span>
                  <span data-testid="cart-total" className="text-2xl font-bold">{formatPrice(finalTotal)}</span>
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
                    data-testid="cart-checkout-disabled"
                    className="px-6 py-3 text-center bg-white/30 text-black/50 rounded-sm border-2 border-white/30 font-bold uppercase tracking-wide cursor-not-allowed"
                  >
                    {t("cartCheckout")}
                  </span>
                ) : (
                  <Link
                    href="/shop/checkout"
                    data-testid="cart-checkout"
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
