"use client";

import { useTranslations } from "next-intl";

export default function ShopPage() {
  const t = useTranslations("ShopPage");

  return (
    <section className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white px-4 pt-24 pb-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center text-white drop-shadow-md uppercase tracking-wide">
          {t("title")}
        </h1>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full opacity-50 pointer-events-none grayscale">
          {/* Mock products for visual placeholder */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-black border border-gray-800 p-4 flex flex-col gap-4"
            >
              <div className="aspect-square bg-zinc-800 w-full animate-pulse"></div>
              <div className="h-6 bg-zinc-800 w-3/4 animate-pulse"></div>
              <div className="h-4 bg-zinc-800 w-1/2 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
