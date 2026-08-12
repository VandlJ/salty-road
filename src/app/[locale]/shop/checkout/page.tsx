"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import SectionHeading from "@/components/section-heading";
import PhoneCodeSelect from "@/components/phone-code-select";
import AddressAutocomplete from "@/components/address-autocomplete";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore, cartTotal } from "@/lib/cartStore";
import { DEFAULT_SHIPPING_FEE } from "@/lib/shippingConstants";
import { serverErrorToKey } from "@/lib/serverError";

// Groups digits in 3s ("123 456 789") — the CZ/SK/PL convention and a
// reasonable universal display format for the others too, since this is
// purely cosmetic (the raw digits + country code are what's validated and
// stored, see PHONE_RE in the checkout API route).
function formatPhoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

const ERROR_KEY_MAP = {
  missing_fields: "checkoutErrorMissingFields",
  invalid_email: "checkoutErrorInvalidEmail",
  invalid_phone: "checkoutErrorInvalidPhone",
  field_too_long: "checkoutErrorGeneric",
  invalid_payment_method: "checkoutErrorGeneric",
  invalid_items: "checkoutErrorGeneric",
  rate_limited: "checkoutErrorRateLimited",
  insufficient_stock: "checkoutErrorInsufficientStock",
  invalid_coupon: "couponInvalid",
  coupon_not_applicable: "couponNotApplicable",
  server_error: "checkoutErrorGeneric",
} as const;

export default function CheckoutPage() {
  const t = useTranslations("ShopPage");
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const couponCode = useCartStore((state) => state.couponCode);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const shippingCouponCode = useCartStore((state) => state.shippingCouponCode);
  const setShippingCoupon = useCartStore((state) => state.setShippingCoupon);
  const giftSku = useCartStore((state) => state.giftSku);
  const setGift = useCartStore((state) => state.setGift);

  const [mounted, setMounted] = useState(false);
  // Standard client-mount-detection pattern to avoid an SSR/localStorage
  // hydration mismatch — not the render-cascade pattern the rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+420");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"shipping" | "pickup">("shipping");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Generated once per page load and reused across retries — the server
  // dedupes on this key so a network retry or double-click can't create two
  // orders / double-decrement stock.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Cosmetic preview only — the checkout POST always recomputes the real
  // fee/discount server-side regardless of what's shown here.
  const [baseShippingFee, setBaseShippingFee] = useState(DEFAULT_SHIPPING_FEE);
  useEffect(() => {
    fetch("/api/shop-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setBaseShippingFee(data.shippingFeeHalire ?? DEFAULT_SHIPPING_FEE))
      .catch((err) => console.error(err));
  }, []);

  const cartItems = mounted ? items : [];
  const subtotal = cartTotal(cartItems);

  // Coupon: input + server-validated preview. Only the code persists across
  // navigation (cartStore) — the discount amount is always re-derived from a
  // fresh validate call, never trusted from storage, and the checkout POST
  // re-validates again server-side regardless.
  const [couponInput, setCouponInput] = useState("");
  const [couponPreview, setCouponPreview] = useState<{ code: string; discountAmount: number } | null>(null);
  const [shippingCouponPreview, setShippingCouponPreview] = useState<{ code: string } | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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

  // Re-validate a coupon carried over from a previous visit (e.g. the
  // customer left checkout and came back) — but only once mounted+hydrated.
  useEffect(() => {
    if (mounted && couponCode && !couponPreview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateCoupon(couponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, couponCode]);

  useEffect(() => {
    if (mounted && shippingCouponCode && !shippingCouponPreview) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      validateCoupon(shippingCouponCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, shippingCouponCode]);

  const discountAmount = couponPreview?.discountAmount ?? 0;
  const shippingFee = deliveryMethod === "pickup" ? 0 : shippingCouponPreview ? 0 : baseShippingFee;
  const finalTotal = Math.max(0, subtotal - discountAmount) + shippingFee;

  // Free gift: eligibility never counts shipping (matches the server —
  // checkout/route.ts computes it off subtotal minus discount only), so a
  // shipping-only concession can't accidentally unlock/lock the gift.
  const [giftThreshold, setGiftThreshold] = useState(0);
  useEffect(() => {
    fetch("/api/shop-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setGiftThreshold(data.stickerGiftThresholdHalire ?? 0))
      .catch((err) => console.error(err));
  }, []);

  const giftEligible = giftThreshold > 0 && Math.max(0, subtotal - discountAmount) >= giftThreshold;
  const giftRemaining = Math.max(0, giftThreshold - Math.max(0, subtotal - discountAmount));
  const giftProgressPct =
    giftThreshold > 0 ? Math.min(100, (Math.max(0, subtotal - discountAmount) / giftThreshold) * 100) : 0;

  type GiftOption = { sku: string; productId: string; name: string; description: string; image: string | null };
  const [giftOptions, setGiftOptions] = useState<GiftOption[]>([]);
  useEffect(() => {
    if (giftThreshold <= 0) return;
    fetch("/api/merch/gift-options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => Array.isArray(data) && setGiftOptions(data))
      .catch((err) => console.error(err));
  }, [giftThreshold]);

  const selectedGift = giftOptions.find((o) => o.sku === giftSku) ?? null;

  // Drop the selection the moment it's no longer valid — below threshold
  // (e.g. a coupon applied here just dropped it), or the previously-picked
  // sku sold out / stopped being offered. The checkout POST re-validates
  // server-side regardless — this is just so the UI doesn't silently submit
  // (or keep showing) a stale choice.
  useEffect(() => {
    if (!giftEligible && giftSku) {
      setGift(null);
      return;
    }
    if (giftEligible && giftSku && giftOptions.length > 0 && !giftOptions.some((o) => o.sku === giftSku)) {
      setGift(null);
    }
  }, [giftEligible, giftSku, giftOptions, setGift]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Server/DB/email templates all still expect a single free-text
    // customerName/address/phone string (see src/app/api/merch/checkout/
    // route.ts) — the form is split into more eshop-like fields purely for
    // UX, then joined back into that existing contract on submit.
    try {
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
          customerEmail: email.trim(),
          customerPhone: `${phoneCode} ${phoneNumber.trim()}`.trim(),
          address:
            deliveryMethod === "shipping"
              ? `${street.trim()}, ${zip.trim()} ${city.trim()}`.trim()
              : undefined,
          paymentMethod: "bank_transfer",
          deliveryMethod,
          items: cartItems.map((i) => ({ sku: i.sku, qty: i.qty })),
          couponCode: couponCode || undefined,
          shippingCouponCode: shippingCouponCode || undefined,
          giftSku: giftSku || undefined,
          idempotencyKey,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(t(serverErrorToKey(ERROR_KEY_MAP, json?.error, "checkoutErrorGeneric")));
        setSubmitting(false);
        return;
      }

      sessionStorage.setItem("salty-road-last-order", JSON.stringify(json));
      clear();
      router.push("/shop/thank-you");
    } catch (err) {
      console.error(err);
      setError(t("checkoutErrorGeneric"));
      setSubmitting(false);
    }
  }

  if (mounted && cartItems.length === 0) {
    return (
      <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12 flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400 font-bold">{t("checkoutEmpty")}</p>
        <Link
          href="/shop"
          className="px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
        >
          {t("cartContinueShopping")}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-2xl mx-auto">
        <SectionHeading as="h1" size="lg" className="mb-12">
          {t("checkoutTitle")}
        </SectionHeading>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="firstName" className="text-white font-bold tracking-wide">
                {t("checkoutFirstName")}
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={49}
                className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="lastName" className="text-white font-bold tracking-wide">
                {t("checkoutLastName")}
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={49}
                className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-white font-bold tracking-wide">
              {t("checkoutEmail")}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
              className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-white font-bold tracking-wide">
              {t("checkoutPhone")}
            </label>
            <div className="flex gap-2">
              <PhoneCodeSelect value={phoneCode} onChange={setPhoneCode} label={t("checkoutPhone")} />
              <input
                id="phone"
                data-testid="checkout-phone-number"
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneDigits(e.target.value))}
                placeholder={t("checkoutPhoneNumber")}
                required
                className="flex-1 min-w-0 px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200 tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-white font-bold tracking-wide">
              {t("checkoutDeliveryMethod")}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="delivery-method-shipping"
                onClick={() => setDeliveryMethod("shipping")}
                className={`px-4 py-3 rounded-sm border-2 text-left transition-colors cursor-pointer ${
                  deliveryMethod === "shipping" ? "border-white bg-white/10" : "border-gray-600 hover:border-gray-400"
                }`}
              >
                <div className="font-bold text-white">{t("checkoutDeliveryShipping")}</div>
                <div className="text-sm text-gray-400 mt-0.5">{t("checkoutDeliveryShippingDesc", { price: formatPrice(baseShippingFee) })}</div>
              </button>
              <button
                type="button"
                data-testid="delivery-method-pickup"
                onClick={() => setDeliveryMethod("pickup")}
                className={`px-4 py-3 rounded-sm border-2 text-left transition-colors cursor-pointer ${
                  deliveryMethod === "pickup" ? "border-white bg-white/10" : "border-gray-600 hover:border-gray-400"
                }`}
              >
                <div className="font-bold text-white">{t("checkoutDeliveryPickup")}</div>
                <div className="text-sm text-gray-400 mt-0.5">{t("checkoutDeliveryPickupDesc")}</div>
              </button>
            </div>
          </div>

          <AnimatePresence initial={false}>
          {deliveryMethod === "shipping" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <span className="text-white font-bold tracking-wide">
                  {t("checkoutAddress")}
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="street" className="text-xs text-gray-400 uppercase tracking-wide">
                      {t("checkoutStreet")}
                    </label>
                    <AddressAutocomplete
                      id="street"
                      value={street}
                      onChange={setStreet}
                      onSelect={(s) => {
                        setStreet(s.street);
                        if (s.city) setCity(s.city);
                        if (s.zip) setZip(s.zip);
                      }}
                      required={deliveryMethod === "shipping"}
                      maxLength={150}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="city" className="text-xs text-gray-400 uppercase tracking-wide">
                        {t("checkoutCity")}
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required={deliveryMethod === "shipping"}
                        maxLength={100}
                        className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor="zip" className="text-xs text-gray-400 uppercase tracking-wide">
                        {t("checkoutZip")}
                      </label>
                      <input
                        id="zip"
                        type="text"
                        inputMode="numeric"
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        placeholder="123 45"
                        required={deliveryMethod === "shipping"}
                        maxLength={10}
                        className="w-full sm:w-32 px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <div className="flex flex-col gap-2">
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
                className="text-red-500 text-sm font-bold"
              >
                {couponError}
              </motion.p>
            )}
            </AnimatePresence>
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

          {giftThreshold > 0 && giftOptions.length > 0 && !giftEligible && (
            <div className="p-4 border border-gray-700 rounded-sm bg-white/[0.02]">
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

          <AnimatePresence>
          {giftEligible && giftOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border border-gray-700 rounded-sm p-4 overflow-hidden"
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

          <div className="bg-[#111] border border-gray-700 rounded-sm p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">
              {t("checkoutSummary")}
            </h2>
            <div className="flex flex-col gap-2">
              {cartItems.map((item) => (
                <div key={item.sku} className="flex justify-between text-sm text-gray-300">
                  <span>
                    {item.name} ({item.variantLabel}) x{item.qty}
                  </span>
                  <span>{formatPrice(item.unitPrice * item.qty)}</span>
                </div>
              ))}
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{t("couponDiscount")}</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {selectedGift && (
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>{t("checkoutGiftLabel")}</span>
                <span>{selectedGift.name}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>{t("checkoutShippingFee")}</span>
              <span data-testid="checkout-shipping-fee">
                {shippingFee > 0 ? formatPrice(shippingFee) : t("checkoutShippingFree")}
              </span>
            </div>
            <div className="flex justify-between mt-4 pt-4 border-t border-gray-700 font-bold">
              <span>{t("cartTotal")}</span>
              <span data-testid="checkout-total">{formatPrice(finalTotal)}</span>
            </div>
          </div>

          <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="text-white p-3 border-2 border-red-500 bg-red-600/50 rounded-sm font-bold text-sm">
                {error}
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          <button
            type="submit"
            data-testid="checkout-submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase bg-white text-black shadow-xl border-2 border-white hover:bg-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {submitting ? t("checkoutSubmitting") : t("checkoutSubmit")}
          </button>

          <p className="text-xs text-gray-500 text-center -mt-2">
            {t("checkoutTermsPrefix")}{" "}
            <Link href="/shop/terms" className="underline hover:text-gray-300 transition-colors">
              {t("checkoutTermsLink")}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
