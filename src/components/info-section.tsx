import { useTranslations } from "next-intl";

export default function InfoSection() {
  const t = useTranslations("InfoPage");
  
  return (
    <section id="info" className="bg-transparent text-white px-4 pt-12 pb-12 md:pb-20 max-w-4xl mx-auto min-h-screen scroll-mt-24 text-center">
      <div className="relative pb-1 mb-16 inline-block">
        {/* Outline Layer - Red */}
        <h1 className="absolute inset-0 text-4xl sm:text-5xl font-extrabold text-transparent [-webkit-text-stroke:4px_#ff0302] uppercase tracking-widest select-none z-0 flex items-center justify-center text-center">
          {t("title")}
        </h1>
        {/* Text Layer - White */}
        <h1 className="relative text-4xl sm:text-5xl font-extrabold text-white text-center uppercase tracking-widest drop-shadow-sm z-10">
          {t("title")}
        </h1>
      </div>
      
      <div className="space-y-16 md:space-y-24">
        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-4 inline-block px-8">{t("parkingTitle")}</h2>
          <div className="text-gray-200 text-base leading-relaxed max-w-3xl mx-auto space-y-6 font-light">
            <ul className="list-disc list-outside ml-5 space-y-4 text-left inline-block max-w-full">
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
          <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-4 inline-block px-8">{t("mapTitle")}</h2>
          <div className="w-full h-64 sm:h-96 md:h-[500px] max-w-4xl overflow-hidden border border-gray-700 shadow-2xl relative group">
            <iframe 
              src="https://maps.google.com/maps?q=Velk%C3%A9%20n%C3%A1m%C4%9Bst%C3%AD%2C%20Prachatice&t=&z=17&ie=UTF8&iwloc=&output=embed"
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            ></iframe>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-4 inline-block px-8">{t("sponsorsTitle")}</h2>
          <p className="text-gray-200 text-base leading-relaxed max-w-3xl mx-auto font-light">{t("sponsorsText")}</p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-4 inline-block px-8">{t("programTitle")}</h2>
          
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
               
               <div className="space-y-3">
                 {[9, 10, 11].map((item) => (
                   <p key={item} className="text-gray-300 text-base font-light flex items-center justify-center gap-2">
                     <span className="w-1.5 h-1.5 bg-white rounded-full opacity-70"></span>
                     {t(`programList.item${item}`)}
                   </p>
                 ))}
               </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest border-b border-gray-800 pb-4 inline-block px-8">{t("rulesTitle")}</h2>
          <div className="text-gray-200 text-base leading-relaxed max-w-3xl mx-auto text-center space-y-6 font-light">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
              <p key={item}>{t(`rulesList.item${item}`)}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
