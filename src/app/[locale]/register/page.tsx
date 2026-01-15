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
        <p className="text-base sm:text-lg text-white mb-8 sm:mb-12 text-center leading-relaxed px-2 max-w-2xl font-medium drop-shadow-sm">
          {t("subtitle")}
        </p>

        {/* Info Section */}
        <div className="w-full bg-[#111]/90 border border-gray-600 p-6 md:p-8 mb-12 rounded-none backdrop-blur-md shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-white border-b border-gray-600 pb-2 uppercase tracking-wide">
            {t("importantInfoTitle")}
          </h2>
          
          <div className="space-y-8 text-gray-200">
            <div>
              <h3 className="text-white font-bold mb-2 uppercase text-lg">{t("arrival.title")}</h3>
              <p className="mb-2 text-gray-100">{t("arrival.text")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-300">
                <li>{t.rich("arrival.time1", { strong })}</li>
                <li>{t.rich("arrival.time2", { strong })}</li>
              </ul>
              <p className="mt-2 text-sm text-red-400 italic font-semibold">
                {t("arrival.warning")}
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase text-lg">{t("departure.title")}</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-300">
                <li>{t.rich("departure.time1", { strong })}</li>
                <li>{t.rich("departure.time2", { strong })}</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase text-lg">{t("conditions.title")}</h3>
              <p className="mb-4 text-gray-100">
                {t.rich("conditions.p1", { strong })}
              </p>
              <p className="mb-4 text-gray-100">
                {t("conditions.p2")}
              </p>
              <p className="mb-2 font-bold text-white">{t("conditions.feeIncludes")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-300">
                <li>{t("conditions.feeList1")}</li>
                <li>{t("conditions.feeList2")}</li>
                <li>{t("conditions.feeList3")}</li>
              </ul>
              <p className="text-gray-100">
                {t("conditions.p3")}
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase text-lg">{t("fee.title")}</h3>
              <p className="mb-4 text-gray-100">
                {t("fee.p1")}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-300">
                <li>{t.rich("fee.refund1", { strong })}</li>
                <li>{t.rich("fee.refund2", { strong })}</li>
              </ul>
              <div className="text-xl text-white border-2 border-white inline-block px-6 py-3 mt-2 font-medium bg-white/5">
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