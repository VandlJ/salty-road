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
