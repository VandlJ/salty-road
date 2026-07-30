"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useEffect, useState } from "react";
import SectionHeading from "@/components/section-heading";
import { formatPrice } from "@/lib/formatPrice";

interface LastOrder {
  orderId: string;
  vs: string;
  totalAmount: number;
  paymentMethod: "bank_transfer" | "cod";
  qrCodeBase64?: string;
}

export default function ThankYouPage() {
  const t = useTranslations("ShopPage");
  const [order, setOrder] = useState<LastOrder | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Reading sessionStorage on mount — client-only data source that can't
    // be known during SSR, so this necessarily happens post-mount. Not the
    // render-cascade pattern the rule targets.
    try {
      const raw = sessionStorage.getItem("salty-road-last-order");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setOrder(JSON.parse(raw));
    } catch (err) {
      console.error(err);
    } finally {
      setChecked(true);
    }
  }, []);

  if (!checked) return null;

  if (!order) {
    return (
      <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12 flex flex-col items-center justify-center gap-6">
        <p className="text-gray-400 font-bold">{t("thankYouNoOrder")}</p>
        <Link
          href="/shop"
          className="px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
        >
          {t("thankYouBackToShop")}
        </Link>
      </section>
    );
  }

  return (
    <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-md mx-auto text-center">
        <SectionHeading as="h1" size="lg" className="mb-8">
          {t("thankYouTitle")}
        </SectionHeading>

        <div className="bg-[#111] border border-gray-700 rounded-sm p-6 flex flex-col gap-4">
          <div className="flex justify-between text-sm text-gray-400">
            <span>{t("thankYouOrderId")}</span>
            <span className="text-white font-mono">{order.orderId}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{t("thankYouVs")}</span>
            <span className="text-white font-mono font-bold">{order.vs}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>{t("thankYouTotal")}</span>
            <span className="text-white font-bold">{formatPrice(order.totalAmount)}</span>
          </div>

          <p className="text-gray-300 text-sm mt-2">
            {order.paymentMethod === "bank_transfer" ? t("thankYouBankTransfer") : t("thankYouCod")}
          </p>

          {order.paymentMethod === "bank_transfer" && order.qrCodeBase64 && (
            // next/image doesn't optimize data: URIs — a plain <img> is the
            // right tool for a one-off base64-encoded QR code.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${order.qrCodeBase64}`}
              alt={t("thankYouQrAlt")}
              className="w-48 h-48 mx-auto mt-2 border border-gray-700 rounded-sm bg-white p-2"
            />
          )}
        </div>

        <Link
          href="/shop"
          className="inline-block mt-8 px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
        >
          {t("thankYouBackToShop")}
        </Link>
      </div>
    </section>
  );
}
