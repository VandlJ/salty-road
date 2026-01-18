import { useTranslations } from "next-intl";

export default function InfoSection() {
  const t = useTranslations("InfoPage");
  
  return (
    <section id="info" className="bg-transparent text-white px-4 pt-8 pb-12 max-w-4xl mx-auto min-h-screen scroll-mt-24">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center text-white drop-shadow-md">
        {t("title")}
      </h1>
      
      <div className="space-y-12">
        <div className="p-6 border border-gray-600 bg-[#111]/80 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{t("parkingTitle")}</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{t("parkingText")}</p>
        </div>

        <div className="p-6 border border-gray-600 bg-[#111]/80 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{t("mapTitle")}</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{t("mapText")}</p>
        </div>

        <div className="p-6 border border-gray-600 bg-[#111]/80 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{t("sponsorsTitle")}</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{t("sponsorsText")}</p>
        </div>

        <div className="p-6 border border-gray-600 bg-[#111]/80 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{t("programTitle")}</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{t("programText")}</p>
        </div>

        <div className="p-6 border border-gray-600 bg-[#111]/80 backdrop-blur-sm shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-white border-b border-gray-600 pb-2">{t("rulesTitle")}</h2>
          <p className="text-gray-200 text-lg leading-relaxed">{t("rulesText")}</p>
        </div>
      </div>
    </section>
  );
}
