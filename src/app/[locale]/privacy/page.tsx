"use client";

import React from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <SectionHeading>{title}</SectionHeading>
      <div className="text-gray-300 text-base leading-relaxed font-light space-y-3">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const t = useTranslations("PrivacyPage");

  return (
    <section className="flex-1 bg-transparent text-white px-4 pt-6 md:pt-10 pb-12 max-w-3xl mx-auto w-full">
      <SectionHeading as="h1" size="lg" className="mb-2">
        {t("title")}
      </SectionHeading>
      <p className="text-gray-500 text-sm mb-12 mt-4">{t("updated")}</p>

      <p className="text-gray-300 leading-relaxed mb-12 font-light">{t("intro")}</p>

      <div className="space-y-12">
        <Section title={t("controllerTitle")}>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {[1, 2].map((i) => (
              <li key={i}>{t(`controllerList.item${i}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t("dataTitle")}>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i}>{t(`dataList.item${i}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t("purposeTitle")}>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i}>{t(`purposeList.item${i}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t("cookiesTitle")}>
          <p>{t("cookiesText")}</p>
        </Section>

        <Section title={t("recipientsTitle")}>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i}>{t(`recipientsList.item${i}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t("retentionTitle")}>
          <p>{t("retentionText")}</p>
        </Section>

        <Section title={t("rightsTitle")}>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i}>{t(`rightsList.item${i}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t("contactTitle")}>
          <p>{t("contactText")}</p>
        </Section>
      </div>
    </section>
  );
}
