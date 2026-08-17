"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";
import { motion } from "motion/react";

// The parking/programme/rules lists are keyed item1..itemN and read by index,
// which next-intl cannot verify — a key built by interpolation is just
// `string`. PrivacyPage and ArchivePage.recap store their lists as real JSON
// arrays instead, which is the pattern to copy; it doesn't fit here yet
// because these items are rendered with t.rich (per-item links), and rich
// formatting needs a message key rather than a value.
//
// Kept as one narrow, greppable cast rather than a shared helper on purpose:
// this component is currently unreachable (only src/templates/homepage-vol2.tsx
// imports it) and is due to be rebuilt from Edition data, at which point both
// the cast and the item1..N shape should go.
type InfoPageKey = Parameters<ReturnType<typeof useTranslations<"InfoPage">>>[0];
const listKey = (list: string, index: number) => `${list}.item${index}` as InfoPageKey;

export default function InfoSection() {
  const t = useTranslations("InfoPage");

  return (
    <section id="info" className="reveal-on-scroll bg-transparent text-white px-4 pt-12 pb-12 md:pb-20 max-w-4xl mx-auto min-h-dvh scroll-mt-24 text-center overflow-hidden">
      <SectionHeading as="h2" size="lg" className="mb-16">
        {t("title")}
      </SectionHeading>

      <div className="space-y-16 md:space-y-24">
        <div className="space-y-6">
          <SectionHeading>{t("parkingTitle")}</SectionHeading>
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex gap-3 p-4 rounded-sm border border-gray-800 bg-white/[0.03]">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-brand" />
                  <span className="text-gray-200 text-base leading-relaxed font-light">
                    {t.rich(listKey("parkingList", item), {
                      mapLink: (chunks) => (
                        <a href="https://mapy.cz/s/cozufafuru" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline hover:text-gray-300 transition-colors">
                          {chunks}
                        </a>
                      ),
                    })}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-gray-200 text-base leading-relaxed font-light border-t border-gray-800 pt-6">
              {t(`parkingList.item6`)}
            </p>
          </div>
        </div>

        <div className="space-y-8 w-full flex flex-col items-center">
          <SectionHeading>{t("mapTitle")}</SectionHeading>
          <div className="w-full h-64 sm:h-96 md:h-[500px] max-w-4xl overflow-hidden border border-gray-700 shadow-2xl relative group rounded-sm">
            <Image
              src="/map_namesti.webp"
              alt="Map"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              loading="lazy"
              quality={65}
            />
          </div>
        </div>



        <div className="space-y-6">
          <SectionHeading>{t("programTitle")}</SectionHeading>

          <div className="max-w-3xl mx-auto">
            {/* Main Program — left-rail timeline */}
            <motion.div
              className="relative pl-6 pr-6 sm:pl-8 sm:pr-0 mb-8 border-l border-gray-800 space-y-6 text-left max-w-2xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              transition={{ staggerChildren: 0.1 }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((item) => {
                 const text = t(listKey("programList", item));
                 const parts = text.split(" - ");
                 const time = parts[0];
                 const rawEvent = parts.slice(1).join(" - ");
                 const event = rawEvent.charAt(0).toUpperCase() + rawEvent.slice(1);

                 return (
                   <motion.div
                     key={item}
                     variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
                     transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                     className="relative"
                   >
                     <span className="absolute -left-6 sm:-left-8 -translate-x-1/2 top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-[#0a0a0a]" />
                     <span className="block text-white font-extrabold text-sm uppercase tracking-widest">{time}</span>
                     <span className="block text-gray-200 text-base font-light mt-0.5">{event}</span>
                   </motion.div>
                 );
              })}
            </motion.div>

            {/* Side Program */}
            <div className="pt-8 border-t border-gray-800">
               <div className="mb-6">
                 <p className="text-white text-base font-bold uppercase tracking-widest">
                   {t.rich("programList.item8", { strong: (chunks) => chunks })}
                 </p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 max-w-2xl mx-auto">
                 {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((item) => {
                   const links: Record<number, string> = {
                     9: "https://www.instagram.com/jakub_bouda_/",
                     10: "https://www.instagram.com/cherry.braids.pt/",
                     11: "https://www.instagram.com/carymary_pt/",
                     12: "https://www.instagram.com/club_hrozen_prachatice/",
                     13: "https://www.instagram.com/cafe.madona/",
                     14: "https://www.instagram.com/blackbearprachatice/",
                     15: "https://www.instagram.com/tukan_klub/",
                   };

                   return (
                     <div key={item} className="text-center md:text-left text-gray-300 text-base font-light">
                       <div className="inline-flex items-start text-left break-words max-w-full md:max-w-none text-pretty">
                         <span className="w-1.5 h-1.5 bg-brand mt-2.5 mr-3 shrink-0"></span>
                         <span>
                           {t.rich(listKey("programList", item), {
                             link: (chunks) => (
                               <a 
                                 href={links[item]} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 className="text-white font-medium underline hover:text-gray-300 transition-colors"
                               >
                                 {chunks}
                               </a>
                             ),
                           })}
                         </span>
                       </div>
                     </div>
                   );
                 })}
               </div>

               <div className="mt-8 flex justify-center">
                 <p className="text-sm text-white font-medium tracking-wide uppercase border border-white/50 bg-white/10 inline-block px-4 py-1 rounded-sm">
                   {t("programList.freeEntrance")}
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeading>{t("rulesTitle")}</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <div key={item} className="flex gap-4 p-4 rounded-sm border border-gray-800 bg-white/[0.03]">
                <span className="shrink-0 text-brand font-extrabold text-lg leading-none tabular-nums">
                  {String(item).padStart(2, "0")}
                </span>
                <p className="text-gray-200 text-sm leading-relaxed font-light">{t(listKey("rulesList", item))}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exhibitor Info Section */}
        <div className="w-full bg-[#111] border border-gray-800 p-6 md:p-12 mt-16 rounded-sm shadow-2xl text-center relative overflow-hidden">
          <SectionHeading className="mb-10">{t("importantInfoTitle")}</SectionHeading>

          <div className="space-y-12 text-gray-200">
            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("arrival.title")}</h3>
              <p className="mb-2 text-gray-200 font-light text-base">{t("arrival.text")}</p>
              <ul className="list-none space-y-2 text-gray-300">
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("arrival.time1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("arrival.time2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-red-400 font-medium tracking-wide uppercase border border-red-900/50 bg-red-900/10 inline-block px-4 py-1 rounded-sm">
                {t("arrival.warning")}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("departure.title")}</h3>
              <ul className="list-none space-y-2 text-gray-300">
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("departure.time1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("departure.time2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("conditions.title")}</h3>
              <p className="mb-2 text-gray-200 font-light text-base">
                {t.rich("conditions.p1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}
              </p>
              <p className="mb-2 text-gray-200 font-light text-base">
                {t("conditions.p1_selection")}
              </p>
              <p className="mt-4 mb-4 text-sm text-red-400 font-medium tracking-wide uppercase border border-red-900/50 bg-red-900/10 inline-block px-4 py-1 rounded-sm">
                {t("conditions.warning")}
              </p>
              <p className="mb-4 text-gray-200 font-light text-base">
                {t("conditions.p2")}
              </p>
              <div className="bg-white/5 p-6 rounded-sm border border-white/10 text-left">
                <p className="mb-4 font-bold text-white uppercase tracking-wide text-center">{t("conditions.feeIncludes")}</p>
                <ul className="list-none space-y-3 mb-4 text-gray-300">
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" /> 
                    <span>{t("conditions.feeList1")}</span>
                  </li>
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" /> 
                    <span>{t("conditions.feeList2")}</span>
                  </li>
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" /> 
                    <span>{t("conditions.feeList3")}</span>
                  </li>
                </ul>
              </div>
              <p className="text-gray-200 font-light mt-4">
                {t("conditions.p3")}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("fee.title")}</h3>
              <p className="mb-4 text-gray-200 font-light">
                {t("fee.p1")}
              </p>
              <ul className="list-none space-y-2 mb-6 text-gray-300">
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("fee.refund1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
                <li className="flex items-start justify-center gap-3">
                  <span className="w-1.5 h-1.5 bg-brand mt-2.5 shrink-0" />
                  <span>{t.rich("fee.refund2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</span>
                </li>
              </ul>
              <div className="text-sm sm:text-base text-white border border-white/30 inline-block px-10 py-3 sm:px-20 sm:py-4 font-medium bg-gradient-to-r from-white/10 to-transparent uppercase tracking-widest shadow-lg min-w-[260px] sm:min-w-[380px] rounded-sm">
                <div className="flex flex-col items-center gap-1">
                  <span>{t("fee.label")}</span>
                  <span className="font-bold text-white text-lg sm:text-xl">{t("fee.amount")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
