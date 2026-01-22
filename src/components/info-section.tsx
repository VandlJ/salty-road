import { useTranslations } from "next-intl";
import Image from "next/image";

export default function InfoSection() {
  const t = useTranslations("InfoPage");
  
  return (
    <section id="info" className="bg-transparent text-white px-4 pt-12 pb-12 md:pb-20 max-w-4xl mx-auto min-h-screen scroll-mt-24 text-center overflow-hidden">
      <div className="relative mb-16 inline-block pb-6 px-4 sm:px-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-widest drop-shadow-sm bg-gradient-to-tr from-gray-100 to-gray-400 bg-clip-text text-transparent break-words">
          {t("title")}
        </h1>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </div>
      
      <div className="space-y-16 md:space-y-24">
        <div className="space-y-6">
          <div className="relative inline-block px-2 sm:px-8 pb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-auto">{t("parkingTitle")}</h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          <div className="text-gray-200 text-base leading-relaxed max-w-3xl mx-auto space-y-6 font-light">
            <ul className="list-disc list-outside pl-5 space-y-4 text-left block w-full max-w-full">
              {[1, 2, 3, 4, 5].map((item) => (
                <li key={item} className="pl-2">
                  {t.rich(`parkingList.item${item}`, {
                    mapLink: (chunks) => (
                      <a href="https://mapy.cz/s/cozufafuru" target="_blank" rel="noopener noreferrer" className="text-white font-medium underline hover:text-gray-300 transition-colors">
                        {chunks}
                      </a>
                    ),
                  })}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center border-t border-gray-800 pt-6">
              {t(`parkingList.item6`)}
            </p>
          </div>
        </div>

        <div className="space-y-8 w-full flex flex-col items-center">
          <div className="relative inline-block px-2 sm:px-8 pb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-auto">{t("mapTitle")}</h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          <div className="w-full h-64 sm:h-96 md:h-[500px] max-w-4xl overflow-hidden border border-gray-700 shadow-2xl relative group">
            <Image 
              src="/map_namesti.webp"
              alt="Map"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>



        <div className="space-y-6">
          <div className="relative inline-block px-2 sm:px-8 pb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-auto">{t("programTitle")}</h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          
          <div className="max-w-3xl mx-auto">
            {/* Main Program */}
            <div className="space-y-2 mb-8">
              {[1, 2, 3, 4, 5, 6, 7].map((item) => {
                 const text = t(`programList.item${item}`);
                 const parts = text.split(" - ");
                 const time = parts[0];
                 const rawEvent = parts.slice(1).join(" - ");
                 const event = rawEvent.charAt(0).toUpperCase() + rawEvent.slice(1);
                 
                 return (
                   <div key={item} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-6 text-center sm:text-left justify-center sm:justify-start p-2 rounded">
                     <span className="text-white font-extrabold text-base sm:w-40 sm:text-right shrink-0 tracking-wider">{time}</span>
                     <span className="text-gray-200 text-base font-light">{event}</span>
                   </div>
                 );
              })}
            </div>

            {/* Side Program */}
            <div className="pt-6 border-t border-gray-800">
               <div className="mb-6">
                 <p className="text-white text-base font-bold uppercase tracking-widest">
                   {t.rich("programList.item8", { strong: (chunks) => chunks })}
                 </p>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 max-w-2xl mx-auto">
                 {[9, 10, 11, 12, 13, 14, 15, 16].map((item) => {
                   const links: Record<number, string> = {
                     9: "https://www.instagram.com/jakub_bouda_/",
                     10: "https://www.instagram.com/cherry.braids.pt/",
                     11: "https://www.instagram.com/carymary_pt/",
                     12: "https://www.instagram.com/club_hrozen_prachatice/",
                     13: "https://www.instagram.com/cafe.madona/",
                     14: "https://www.instagram.com/blackbearprachatice/",
                   };

                   return (
                     <div key={item} className="text-center md:text-left text-gray-300 text-base font-light">
                       <div className="inline-flex items-start text-left break-words max-w-full md:max-w-none text-pretty">
                         <span className="w-1.5 h-1.5 bg-white/60 rounded-full mt-2.5 mr-3 shrink-0"></span>
                         <span>
                           {t.rich(`programList.item${item}`, {
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
                 <p className="text-sm text-white font-medium tracking-wide uppercase border border-white/50 bg-white/10 inline-block px-4 py-1">
                   {t("programList.freeEntrance")}
                 </p>
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="relative inline-block px-2 sm:px-8 pb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-auto">{t("rulesTitle")}</h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          <div className="text-gray-200 text-base leading-relaxed max-w-3xl mx-auto text-center space-y-6 font-light">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <p key={item}>{t(`rulesList.item${item}`)}</p>
            ))}
          </div>
        </div>

        {/* Exhibitor Info Section */}
        <div className="w-full bg-[#111]/90 border border-gray-800 p-6 md:p-12 mt-16 rounded-sm backdrop-blur-md shadow-2xl text-center relative overflow-hidden">
          <div className="relative inline-block px-2 sm:px-8 pb-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest break-words hyphens-none">
              {t("importantInfoTitle")}
            </h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          
          <div className="space-y-12 text-gray-200">
            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("arrival.title")}</h3>
              <p className="mb-2 text-gray-200 font-light text-base">{t("arrival.text")}</p>
              <ul className="list-none space-y-2 text-gray-300">
                <li>{t.rich("arrival.time1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
                <li>{t.rich("arrival.time2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
              </ul>
              <p className="mt-4 text-sm text-red-400 font-medium tracking-wide uppercase border border-red-900/50 bg-red-900/10 inline-block px-4 py-1">
                {t("arrival.warning")}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("departure.title")}</h3>
              <ul className="list-none space-y-2 text-gray-300">
                <li>{t.rich("departure.time1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
                <li>{t.rich("departure.time2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
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
              <p className="mt-4 mb-4 text-sm text-red-400 font-medium tracking-wide uppercase border border-red-900/50 bg-red-900/10 inline-block px-4 py-1">
                {t("conditions.warning")}
              </p>
              <p className="mb-4 text-gray-200 font-light text-base">
                {t("conditions.p2")}
              </p>
              <div className="bg-white/5 p-6 rounded-sm border border-white/10 text-left">
                <p className="mb-4 font-bold text-white uppercase tracking-wide text-center">{t("conditions.feeIncludes")}</p>
                <ul className="list-none space-y-3 mb-4 text-gray-300">
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-white rounded-full mt-2.5 shrink-0" /> 
                    <span>{t("conditions.feeList1")}</span>
                  </li>
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-white rounded-full mt-2.5 shrink-0" /> 
                    <span>{t("conditions.feeList2")}</span>
                  </li>
                  <li className="flex items-start justify-start md:justify-center gap-3">
                    <span className="w-1.5 h-1.5 bg-white rounded-full mt-2.5 shrink-0" /> 
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
                <li>{t.rich("fee.refund1", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
                <li>{t.rich("fee.refund2", { strong: (chunks) => <strong className="text-white">{chunks}</strong> })}</li>
              </ul>
              <div className="text-sm sm:text-base text-white border border-white/30 inline-block px-10 py-3 sm:px-20 sm:py-4 font-medium bg-gradient-to-r from-white/10 to-transparent uppercase tracking-widest shadow-lg min-w-[260px] sm:min-w-[380px]">
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
