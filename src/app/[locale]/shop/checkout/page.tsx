"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";
import { useCartStore, cartTotal } from "@/lib/cartStore";

type PaymentMethod = "bank_transfer" | "cod";

const ERROR_KEY_MAP: Record<string, string> = {
  missing_fields: "checkoutErrorMissingFields",
  invalid_email: "checkoutErrorInvalidEmail",
  invalid_phone: "checkoutErrorInvalidPhone",
  field_too_long: "checkoutErrorGeneric",
  invalid_payment_method: "checkoutErrorGeneric",
  invalid_items: "checkoutErrorGeneric",
  rate_limited: "checkoutErrorRateLimited",
  insufficient_stock: "checkoutErrorInsufficientStock",
  server_error: "checkoutErrorGeneric",
};

export default function CheckoutPage() {
  const t = useTranslations("ShopPage");
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);

  const [mounted, setMounted] = useState(false);
  // Standard client-mount-detection pattern to avoid an SSR/localStorage
  // hydration mismatch — not the render-cascade pattern the rule targets.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cartItems = mounted ? items : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          address: address.trim(),
          paymentMethod,
          items: cartItems.map((i) => ({ sku: i.sku, qty: i.qty })),
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
      <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12 flex flex-col items-center justify-center gap-6">
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
    <section className="min-h-screen bg-black text-white px-4 pt-24 pb-12">
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
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-700 font-bold">
            <span>{t("cartTotal")}</span>
            <span>{formatPrice(cartTotal(cartItems))}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-white font-bold tracking-wide">
              {t("checkoutName")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
            />
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
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={20}
              className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="address" className="text-white font-bold tracking-wide">
              {t("checkoutAddress")}
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("checkoutAddressPlaceholder")}
              required
              maxLength={300}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white resize-none transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-white font-bold tracking-wide">{t("checkoutPaymentMethod")}</span>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                  className="accent-white w-4 h-4"
                />
                <span className="text-gray-200">{t("checkoutBankTransfer")}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="accent-white w-4 h-4"
                />
                <span className="text-gray-200">{t("checkoutCod")}</span>
              </label>
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
