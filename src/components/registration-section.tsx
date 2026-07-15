"use client";

import RegisterForm from "@/components/registerForm";
import { useTranslations } from "next-intl";
import React from "react";
import { REGISTRATION_OPEN } from "@/lib/registration";

export default function RegistrationSection() {
  const t = useTranslations("RegisterPage");

  return (
    <section id="register" className={`bg-transparent text-white px-4 pt-12 pb-20 max-w-4xl mx-auto scroll-mt-24 overflow-hidden ${REGISTRATION_OPEN ? "min-h-screen" : ""}`}>
      <div className="flex flex-col items-center">
        <div className="relative mb-16 inline-block pb-6 px-4 sm:px-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-center uppercase tracking-widest drop-shadow-sm bg-gradient-to-tr from-gray-100 to-gray-400 bg-clip-text text-transparent">
            {t.rich("title", { line: (chunks) => <span className="block">{chunks}</span> })}
          </h1>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>

        {REGISTRATION_OPEN && (
          <p className="text-base sm:text-base text-gray-200 mb-12 sm:mb-16 text-center leading-relaxed px-2 max-w-3xl font-light">
            {t("subtitle")}
          </p>
        )}

        {REGISTRATION_OPEN ? (
          <div className="w-full max-w-3xl">
            <RegisterForm />
          </div>
        ) : (
          <div className="w-full max-w-3xl rounded-sm border border-gray-800 bg-white/5 px-6 py-10 text-center">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-white mb-3">
              {t("closedTitle")}
            </h2>
            <p className="text-gray-200 font-light">{t("closedMessage")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
