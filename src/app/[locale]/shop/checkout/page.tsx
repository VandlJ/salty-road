"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import PhoneCodeSelect from "@/components/phone-code-select";
import AddressAutocomplete from "@/components/address-autocomplete";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore, cartTotal } from "@/lib/cartStore";

// Groups digits in 3s ("123 456 789") — the CZ/SK/PL convention and a
// reasonable universal display format for the others too, since this is
// purely cosmetic (the raw digits + country code are what's validated and
// stored, see PHONE_RE in the checkout API route).
function formatPhoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

const ERROR_KEY_MAP: Record<string, string> = {
  missing_fields: "checkoutErrorMissingFields",
  invalid_email: "checkoutErrorInvalidEmail",
  invalid_phone: "checkoutErrorInvalidPhone",
  field_too_long: "checkoutErrorGeneric",
  invalid_payment_method: "checkoutErrorGeneric",
  invalid_items: "checkoutErrorGeneric",
  rate_limited: "checkoutErrorRateLimited",
  insufficient_stock: "checkoutErrorInsufficientStock",
  invalid_coupon: "couponInvalid",
  server_error: "checkoutErrorGeneric",
};

export default function CheckoutPage() {
  const t = useTranslations("ShopPage");
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const couponCode = useCartStore((state) => state.couponCode);

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
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = mounted ? items : [];
  const subtotal = cartTotal(cartItems);

  // Re-derive the discount for display here too (cart already validated it,
  // but checkout is a fresh page load) — purely cosmetic, the checkout POST
  // always re-validates the coupon server-side regardless.
  const [discountAmount, setDiscountAmount] = useState(0);
  useEffect(() => {
    if (!couponCode || subtotal === 0) {
      setDiscountAmount(0);
      return;
    }
    fetch("/api/merch/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setDiscountAmount(json?.discountAmount ?? 0))
      .catch(() => setDiscountAmount(0));
  }, [couponCode, subtotal]);

  const finalTotal = Math.max(0, subtotal - discountAmount);

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
          address: `${street.trim()}, ${zip.trim()} ${city.trim()}`.trim(),
          paymentMethod: "bank_transfer",
          items: cartItems.map((i) => ({ sku: i.sku, qty: i.qty })),
          couponCode: couponCode || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(t(ERROR_KEY_MAP[json?.error] ?? "checkoutErrorGeneric"));
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

        <div className="mb-8 bg-[#111] border border-gray-700 rounded-sm p-4">
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
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-700 font-bold">
            <span>{t("cartTotal")}</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>

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
                  required
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
                    required
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
                    required
                    maxLength={10}
                    className="w-full sm:w-32 px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-white p-3 border-2 border-red-500 bg-red-600/50 rounded-sm font-bold text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase bg-white text-black shadow-xl border-2 border-white hover:bg-gray-200 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t("checkoutSubmitting") : t("checkoutSubmit")}
          </button>
        </form>
      </div>
    </section>
  );
}
