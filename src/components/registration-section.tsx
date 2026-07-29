"use client";

import RegisterForm from "@/components/registerForm";
import SectionHeading from "@/components/section-heading";
import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

export default function RegistrationSection() {
  const t = useTranslations("RegisterPage");
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/registration-status")
      .then((res) => res.json())
      .then((data) => setRegistrationOpen(!!data.open))
      .catch(() => setRegistrationOpen(false));
  }, []);

  if (registrationOpen === null) {
    return <section id="register" className="bg-transparent px-4 pt-12 pb-20 max-w-4xl mx-auto scroll-mt-24" />;
  }

  return (
    <section id="register" className={`bg-transparent text-white px-4 pt-12 pb-20 max-w-4xl mx-auto scroll-mt-24 overflow-hidden ${registrationOpen ? "min-h-screen" : ""}`}>
      <div className="flex flex-col items-center">
        <SectionHeading as="h1" size="lg" className="mb-16">
          {t.rich("title", { line: (chunks) => <span className="block">{chunks}</span> })}
        </SectionHeading>

        {registrationOpen && (
          <p className="text-base sm:text-base text-gray-200 mb-12 sm:mb-16 text-center leading-relaxed px-2 max-w-3xl font-light">
            {t("subtitle")}
          </p>
        )}

        {registrationOpen ? (
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
