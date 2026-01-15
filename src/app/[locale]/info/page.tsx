import { useTranslations } from "next-intl";

export default function InfoPage() {
  const t = useTranslations("InfoPage");
  
  return (
    <section className="bg-transparent text-white px-4 pt-8 pb-12 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent">
        {t("title")}
      </h1>
      
      <div className="space-y-12">
        <div id="parking" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">{t("parkingTitle")}</h2>
          <p className="text-gray-400">{t("parkingText")}</p>
        </div>

        <div id="map" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">{t("mapTitle")}</h2>
          <p className="text-gray-400">{t("mapText")}</p>
        </div>

        <div id="sponsors" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">{t("sponsorsTitle")}</h2>
          <p className="text-gray-400">{t("sponsorsText")}</p>
        </div>

        <div id="program" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">{t("programTitle")}</h2>
          <p className="text-gray-400">{t("programText")}</p>
        </div>

        <div id="rules" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">{t("rulesTitle")}</h2>
          <p className="text-gray-400">{t("rulesText")}</p>
        </div>
      </div>
    </section>
  );
}

