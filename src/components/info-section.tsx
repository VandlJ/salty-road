import { useTranslations } from "next-intl";

export default function InfoSection() {
  const t = useTranslations("InfoPage");
  
  return (
    <section id="info" className="bg-transparent text-white px-4 pt-8 pb-12 max-w-4xl mx-auto min-h-screen scroll-mt-24 text-center">
      <h1 className="text-3xl font-extrabold mb-12 text-center text-white drop-shadow-md uppercase tracking-wide">
        {t("title")}
      </h1>
      
      <div className="space-y-16">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{t("parkingTitle")}</h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">{t("parkingText")}</p>
        </div>

        <div className="space-y-6 w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{t("mapTitle")}</h2>
          <div className="w-full h-96 md:h-[500px] w-full max-w-3xl overflow-hidden border border-gray-800 shadow-2xl relative group">
             {/* Map overlay for styling */}
            <div className="absolute inset-0 pointer-events-none z-10 mix-blend-overlay bg-black/20" />
            <iframe 
              src="https://maps.google.com/maps?q=Velk%C3%A9%20n%C3%A1m%C4%9Bst%C3%AD%2C%20Prachatice&t=&z=17&ie=UTF8&iwloc=&output=embed"
              width="100%" 
              height="100%" 
              style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(120%)' }} 
              allowFullScreen={true} 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
            ></iframe>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{t("sponsorsTitle")}</h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">{t("sponsorsText")}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{t("programTitle")}</h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">{t("programText")}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider">{t("rulesTitle")}</h2>
          <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mx-auto">{t("rulesText")}</p>
        </div>
      </div>
    </section>
  );
}
