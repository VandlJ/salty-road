"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SectionHeading from "@/components/section-heading";

type Status = "idle" | "loading" | "done" | "error";

export default function CancelOrderPage() {
  return (
    <Suspense fallback={null}>
      <CancelOrderForm />
    </Suspense>
  );
}

function CancelOrderForm() {
  const t = useTranslations("ShopPage");
  const searchParams = useSearchParams();

  const [orderId, setOrderId] = useState(searchParams.get("id") ?? "");
  const [vs, setVs] = useState(searchParams.get("vs") ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorKey(null);
    try {
      const res = await fetch(`/api/merch/orders/${encodeURIComponent(orderId.trim())}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vs: vs.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorKey(data.error === "not_cancellable" ? "not_cancellable" : "not_found");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setErrorKey("not_found");
      setStatus("error");
    }
  }

  return (
    <section className="flex-1 w-full bg-black text-white px-4 pt-6 md:pt-10 pb-12">
      <div className="max-w-md mx-auto">
        <SectionHeading as="h1" size="lg" className="mb-4 text-center">
          {t("cancelOrderTitle")}
        </SectionHeading>
        <p className="text-gray-400 text-sm text-center mb-8">{t("cancelOrderIntro")}</p>

        {status === "done" ? (
          <p className="text-center text-white font-bold bg-[#111] border border-gray-700 rounded-sm p-6">
            {t("cancelOrderSuccess")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#111] border border-gray-700 rounded-sm p-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              {t("thankYouOrderId")}
              <input
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="bg-black border border-gray-700 rounded-sm px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-400">
              {t("thankYouVs")}
              <input
                required
                value={vs}
                onChange={(e) => setVs(e.target.value)}
                className="bg-black border border-gray-700 rounded-sm px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-white"
              />
            </label>

            {status === "error" && (
              <p className="text-red-400 text-sm">
                {errorKey === "not_cancellable" ? t("cancelOrderErrorNotCancellable") : t("cancelOrderErrorNotFound")}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-2 px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide disabled:opacity-50"
            >
              {status === "loading" ? t("cancelOrderSubmitting") : t("cancelOrderSubmit")}
            </button>
          </form>
        )}

        <Link
          href="/shop"
          className="block text-center mt-8 text-gray-400 hover:text-white underline underline-offset-2 text-sm transition-colors"
        >
          {t("thankYouBackToShop")}
        </Link>
      </div>
    </section>
  );
}
