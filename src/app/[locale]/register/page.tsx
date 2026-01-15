"use client";

import RegisterForm from "@/components/registerForm";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("RegisterPage");
  const strong = (chunks: React.ReactNode) => <strong className="text-white">{chunks}</strong>;

  return (
    <section className="bg-transparent text-white px-4 pt-6 sm:pt-8 pb-8 sm:pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent animate-gradient text-center leading-tight">
          {t("title")}
        </h1>
        <p className="text-base sm:text-lg text-gray-300 mb-8 sm:mb-12 text-center leading-relaxed px-2 max-w-2xl">
          {t("subtitle")}
        </p>

        {/* Info Section */}
        <div className="w-full bg-[#111]/80 border border-[#333] p-6 md:p-8 mb-12 rounded-none backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-[#C0C0C0] border-b border-[#333] pb-2 uppercase tracking-wide">
            {t("importantInfoTitle")}
          </h2>
          
          <div className="space-y-8 text-gray-300">
            <div>
              <h3 className="text-white font-bold mb-2 uppercase">{t("arrival.title")}</h3>
              <p className="mb-2">{t("arrival.text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-400">
                <li>{t.rich("arrival.time1", { strong })}</li>
                <li>{t.rich("arrival.time2", { strong })}</li>
              </ul>
              <p className="mt-2 text-sm text-red-400 italic">
                {t("arrival.warning")}
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">{t("departure.title")}</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-400">
                <li>{t.rich("departure.time1", { strong })}</li>
                <li>{t.rich("departure.time2", { strong })}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">{t("conditions.title")}</h3>
              <p className="mb-4">
                {t.rich("conditions.p1", { strong })}
              </p>
              <p className="mb-4">
                {t("conditions.p2")}
              </p>
              <p className="mb-2 font-semibold text-white">{t("conditions.feeIncludes")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-400">
                <li>{t("conditions.feeList1")}</li>
                <li>{t("conditions.feeList2")}</li>
                <li>{t("conditions.feeList3")}</li>
              </ul>
              <p>
                {t("conditions.p3")}
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">{t("fee.title")}</h3>
              <p className="mb-4">
                {t("fee.p1")}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-400">
                <li>{t.rich("fee.refund1", { strong })}</li>
                <li>{t.rich("fee.refund2", { strong })}</li>
              </ul>
              <div className="text-xl text-white border border-[#C0C0C0] inline-block px-4 py-2 mt-2">
                {t("fee.label")} <span className="font-bold">{t("fee.amount")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}