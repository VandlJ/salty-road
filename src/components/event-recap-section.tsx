"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";
import { motion } from "motion/react";

type Stat = { value: string; label: string };

// Lists come from real JSON arrays in messages/*.json rather than the
// `item1`, `item2`, … + hardcoded index-array pattern used by InfoSection —
// there, adding a bullet means editing both the messages file and a magic
// `[1,2,3,...].map()` in the component. t.raw is untyped, hence the guards.
function useRawArray<T>(t: ReturnType<typeof useTranslations>, key: string): T[] {
  const raw = t.raw(key);
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export default function EventRecapSection() {
  const t = useTranslations("ArchivePage.recap");

  const highlights = useRawArray<string>(t, "highlights");
  const stats = useRawArray<Stat>(t, "stats");

  return (
    <section
      id="recap"
      className="reveal-on-scroll bg-transparent text-white px-4 pt-12 pb-12 md:pb-20 max-w-4xl mx-auto scroll-mt-24 text-center overflow-hidden"
    >
      <SectionHeading as="h2" size="lg" className="mb-12">
        {t("title")}
      </SectionHeading>

      <div className="space-y-16 md:space-y-24">
        <div className="max-w-3xl mx-auto space-y-5 text-left">
          <p className="text-gray-200 text-base sm:text-lg leading-relaxed font-light">{t("p1")}</p>
          <p className="text-gray-200 text-base sm:text-lg leading-relaxed font-light">{t("p2")}</p>
        </div>

        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 p-6 rounded-sm border border-gray-800 bg-white/[0.03]"
              >
                <span className="text-3xl sm:text-4xl font-extrabold text-brand">{stat.value}</span>
                <span className="text-xs uppercase tracking-widest text-gray-400 font-bold text-center">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {highlights.length > 0 && (
          <div className="space-y-6">
            <SectionHeading>{t("highlightsTitle")}</SectionHeading>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-3xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ staggerChildren: 0.08 }}
            >
              {highlights.map((item) => (
                <motion.div
                  key={item}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="flex gap-3 p-4 rounded-sm border border-gray-800 bg-white/[0.03]"
                >
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-brand" />
                  <span className="text-gray-200 text-base leading-relaxed font-light">{item}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        {/* Venue map — same block as InfoSection's, copied rather than
            imported so that component can stay byte-identical as the
            Volume 2 template. */}
        <div className="space-y-8 w-full flex flex-col items-center">
          <SectionHeading>{t("mapTitle")}</SectionHeading>
          <p className="text-gray-300 text-base font-light -mt-2">{t("locationText")}</p>
          <div className="w-full h-64 sm:h-96 md:h-[500px] max-w-4xl overflow-hidden border border-gray-700 shadow-2xl relative group rounded-sm">
            <Image
              src="/map_namesti.webp"
              alt={t("mapTitle")}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              loading="lazy"
              quality={65}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
