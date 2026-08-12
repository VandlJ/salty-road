"use client";

import React from "react";
import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";
import { rawList } from "@/lib/i18nList";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

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
          <BulletList items={rawList<string>(t, "controllerList")} />
        </Section>

        <Section title={t("dataTitle")}>
          <BulletList items={rawList<string>(t, "dataList")} />
        </Section>

        <Section title={t("purposeTitle")}>
          <BulletList items={rawList<string>(t, "purposeList")} />
        </Section>

        <Section title={t("cookiesTitle")}>
          <p>{t("cookiesText")}</p>
        </Section>

        <Section title={t("recipientsTitle")}>
          <BulletList items={rawList<string>(t, "recipientsList")} />
        </Section>

        <Section title={t("retentionTitle")}>
          <p>{t("retentionText")}</p>
        </Section>

        <Section title={t("rightsTitle")}>
          <BulletList items={rawList<string>(t, "rightsList")} />
        </Section>

        <Section title={t("contactTitle")}>
          <p>{t("contactText")}</p>
        </Section>
      </div>
    </section>
  );
}
