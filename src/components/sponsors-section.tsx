"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

export default function SponsorsSection() {
  const t = useTranslations("InfoPage");

  return (
    <section id="sponsors" className="bg-transparent text-white px-4 pt-12 pb-20 max-w-4xl mx-auto scroll-mt-24 text-center overflow-hidden">
        <div className="space-y-12">
            <div className="relative inline-block px-2 sm:px-8 pb-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-none">{t("sponsorsTitle")}</h2>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 items-center justify-items-center max-w-4xl mx-auto px-8 py-10 overflow-hidden bg-white border border-gray-800 shadow-lg rounded-sm">
              <div className="relative w-full h-12 sm:h-16">
                <Image src="/sponsors/prachatice.webp" alt="Prachatice" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-175">
                <Image src="/sponsors/hrozen.webp" alt="Music Club Hrozen" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16">
                <Image src="/sponsors/sts_prachatice.webp" alt="STS Prachatice" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/zephyron.webp" alt="Zephyron" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-250">
                <Image src="/sponsors/breathe.webp" alt="Breathe" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/kuta.webp" alt="Kuta Servis" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-190">
                <Image src="/sponsors/dovoz.webp" alt="Dovoz aut" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-225">
                <Image src="/sponsors/dilna.webp" alt="Dilna Detailing" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-140">
                <Image src="/sponsors/babeta.webp" alt="Babeta Elektro" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/bestlak.webp" alt="Bestlak" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-130">
                <Image src="/sponsors/mx777.webp" alt="MX 777" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-160">
                <Image src="/sponsors/siska_hospoda.webp" alt="Podolská hospůdka" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-140">
                <Image src="/sponsors/siska_taxi.webp" alt="Antonín Šiška Taxi" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-150">
                <Image src="/sponsors/lacoffee.webp" alt="LA Coffee" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-200">
                <Image src="/sponsors/lavape.webp" alt="LA Vape" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/rdetailing.webp" alt="R Detailing" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/ts_instal.webp" alt="TS INSTAL" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/redline.webp" alt="Redline Detailing" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-230">
                <Image src="/sponsors/autolakovna.webp" alt="Autolakovna Lažiště" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/ze_statku.webp" alt="Reklamní studio Ze Statku" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-180">
                <Image src="/sponsors/bart.webp" alt="Železářství Bártovi" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16">
                <Image src="/sponsors/logo-mbrent.webp" alt="MB-Rent-PT" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 scale-200">
                <Image src="/sponsors/logo-folie.webp" alt="FoliePT" fill className="object-contain" />
              </div>
              <div className="relative w-full h-12 sm:h-16 sm:col-span-3">
                <Image src="/sponsors/denik.png" alt="Deník" fill className="object-contain" />
              </div>
            </div>
        </div>
    </section>
  );
}
