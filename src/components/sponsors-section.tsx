"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

export default function SponsorsSection() {
  const t = useTranslations("InfoPage");

  return (
    <section id="sponsors" className="bg-transparent text-white px-4 pt-12 pb-20 max-w-4xl mx-auto scroll-mt-24 text-center overflow-hidden">
        <div className="space-y-12">
            <div className="relative inline-block px-2 sm:px-8 pb-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-auto">{t("sponsorsTitle")}</h2>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 items-center justify-items-center max-w-4xl mx-auto px-8 py-10 overflow-hidden bg-white border border-white/30 shadow-lg rounded-sm">
              <div className="relative w-full h-12 sm:h-16">
                <Image src="/sponsors/prachatice.webp" alt="Prachatice" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16">
                <Image src="/sponsors/sts_prachatice.webp" alt="STS Prachatice" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/zephyron.webp" alt="Zephyron" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 sm:col-span-3">
                <Image src="/sponsors/denik.png" alt="Deník" fill className="object-contain" />
              </div>
            </div>
        </div>
    </section>
  );
}
