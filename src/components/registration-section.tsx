"use client";

import RegisterForm from "@/components/registerForm";
import { useTranslations } from "next-intl";
import React from "react";

export default function RegistrationSection() {
  const t = useTranslations("RegisterPage");
  const strong = (chunks: React.ReactNode) => <strong className="text-white">{chunks}</strong>;

  return (
    <section id="register" className="bg-transparent text-white px-4 pt-12 pb-20 max-w-4xl mx-auto min-h-screen scroll-mt-24">
      <div className="flex flex-col items-center">
        <div className="relative mb-16 inline-block pb-6 px-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center uppercase tracking-widest drop-shadow-sm bg-gradient-to-tr from-gray-100 to-gray-400 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        {/* Info Section */}
        <div className="w-full bg-[#111]/90 border border-gray-800 p-6 md:p-12 mb-12 md:mb-16 rounded-sm backdrop-blur-md shadow-2xl text-center relative overflow-hidden">
          <div className="relative inline-block px-8 pb-4 mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white uppercase tracking-widest">
              {t("importantInfoTitle")}
            </h2>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
          
          <div className="space-y-12 text-gray-200">
            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("arrival.title")}</h3>
              <p className="mb-2 text-gray-200 font-light text-base">{t("arrival.text")}</p>
              <ul className="list-none space-y-2 text-gray-300">
                <li>{t.rich("arrival.time1", { strong })}</li>
                <li>{t.rich("arrival.time2", { strong })}</li>
              </ul>
              <p className="mt-4 text-sm text-red-400 font-medium tracking-wide uppercase border border-red-900/50 bg-red-900/10 inline-block px-4 py-1">
                {t("arrival.warning")}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("departure.title")}</h3>
              <ul className="list-none space-y-2 text-gray-300">
                <li>{t.rich("departure.time1", { strong })}</li>
                <li>{t.rich("departure.time2", { strong })}</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-white font-bold mb-2 uppercase text-base tracking-wider">{t("conditions.title")}</h3>
              <p className="mb-4 text-gray-200 font-light text-base">
                {t.rich("conditions.p1", { strong })}
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
                <li>{t.rich("fee.refund1", { strong })}</li>
                <li>{t.rich("fee.refund2", { strong })}</li>
              </ul>
              <div className="text-base sm:text-base text-white border border-white/30 inline-block px-8 py-4 font-medium bg-gradient-to-r from-white/10 to-transparent uppercase tracking-widest shadow-lg">
                {t("fee.label")} <span className="font-bold ml-2 text-white">{t("fee.amount")}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-base sm:text-base text-gray-200 mb-12 sm:mb-16 text-center leading-relaxed px-2 max-w-3xl font-light">
          {t("subtitle")}
        </p>

        <div className="w-full max-w-3xl">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}
