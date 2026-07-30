"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";

type Sponsor = {
  src: string;
  alt: string;
  scaleClass?: string;
};

// Pure display metadata — no tiering/hierarchy between entries (every
// sponsor renders at the same size). `scaleClass` compensates for each
// logo's own native aspect ratio inside the fixed-height `object-contain`
// box, tuned per-asset.
const sponsors: Sponsor[] = [
  { src: "/sponsors/prachatice.webp", alt: "Prachatice" },
  { src: "/sponsors/hrozen.webp", alt: "Music Club Hrozen", scaleClass: "scale-175" },
  { src: "/sponsors/sts_prachatice.webp", alt: "STS Prachatice" },
  { src: "/sponsors/zephyron.webp", alt: "Zephyron", scaleClass: "scale-180" },
  { src: "/sponsors/breathe.webp", alt: "Breathe", scaleClass: "scale-250" },
  { src: "/sponsors/kuta.webp", alt: "Kuta Servis", scaleClass: "scale-115" },
  { src: "/sponsors/dovoz.webp", alt: "Dovoz aut", scaleClass: "scale-150" },
  { src: "/sponsors/dilna.webp", alt: "Dilna Detailing", scaleClass: "scale-225" },
  { src: "/sponsors/babeta.webp", alt: "Babeta Elektro", scaleClass: "scale-140" },
  { src: "/sponsors/bestlak.webp", alt: "Bestlak", scaleClass: "scale-180" },
  { src: "/sponsors/mx777.webp", alt: "MX 777", scaleClass: "scale-130" },
  { src: "/sponsors/siska_hospoda.webp", alt: "Podolská hospůdka", scaleClass: "scale-160" },
  { src: "/sponsors/siska_taxi.webp", alt: "Antonín Šiška Taxi", scaleClass: "scale-140" },
  { src: "/sponsors/lacoffee.webp", alt: "LA Coffee", scaleClass: "scale-150" },
  { src: "/sponsors/lavape.webp", alt: "LA Vape", scaleClass: "scale-200" },
  { src: "/sponsors/rdetailing.webp", alt: "R Detailing", scaleClass: "scale-180" },
  { src: "/sponsors/ts_instal.webp", alt: "TS INSTAL", scaleClass: "scale-180" },
  { src: "/sponsors/redline.webp", alt: "Redline Detailing", scaleClass: "scale-180" },
  { src: "/sponsors/autolakovna.webp", alt: "Autolakovna Lažiště", scaleClass: "scale-230" },
  { src: "/sponsors/ze_statku.webp", alt: "Reklamní studio Ze Statku", scaleClass: "scale-180" },
  { src: "/sponsors/bart.webp", alt: "Železářství Bártovi", scaleClass: "scale-180" },
  { src: "/sponsors/logo-mbrent.webp", alt: "MB-Rent-PT" },
  { src: "/sponsors/logo-folie.webp", alt: "FoliePT", scaleClass: "scale-220" },
  { src: "/sponsors/logo-tempo.webp", alt: "Tempo Detailing", scaleClass: "scale-90" },
];

export default function SponsorsSection() {
  const t = useTranslations("InfoPage");

  return (
    <section id="sponsors" className="reveal-on-scroll bg-transparent text-white px-4 pt-12 pb-20 max-w-5xl mx-auto scroll-mt-24 text-center overflow-hidden">
      <div className="space-y-8">
        <SectionHeading>{t("sponsorsTitle")}</SectionHeading>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-16 gap-y-16 items-center justify-items-center max-w-5xl mx-auto px-6 sm:px-14 py-12 overflow-hidden bg-white border border-gray-800 shadow-lg rounded-sm">
          {sponsors.map((s) => (
            <div key={s.alt} className="relative w-full h-14 sm:h-20">
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes="(max-width: 640px) 33vw, 260px"
                className={`object-contain ${s.scaleClass ?? ""}`}
              />
            </div>
          ))}
        </div>

        {/* Media/press credit, not a paying sponsor — kept as its own
            full-width row instead of the sm:col-span hack it used inside
            the 3-col grid before this pass. Own white card (logo assets are
            designed for light backgrounds, same as the grid above). */}
        <div className="inline-block bg-white border border-gray-800 shadow-lg rounded-sm px-8 py-5">
          <div className="relative w-40 h-10 sm:w-52 sm:h-14">
            <Image
              src="/sponsors/denik.webp"
              alt="Deník"
              fill
              sizes="208px"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
