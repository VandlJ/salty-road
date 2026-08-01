"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";

export default function NotFoundView() {
  const t = useTranslations("NotFoundPage");

  return (
    <section className="flex-1 w-full bg-black text-white px-4 py-8 flex flex-col items-center justify-center text-center gap-4">
      <Image
        src="/logo_saltyroad-cropped.svg"
        alt="Salty Road"
        width={96}
        height={96}
        className="h-20 sm:h-24 w-auto"
        style={{ filter: "invert(1)" }}
      />
      <span className="text-6xl sm:text-7xl font-extrabold tracking-widest text-white select-none">
        404
      </span>
      <SectionHeading as="h1" size="lg">
        {t("title")}
      </SectionHeading>
      <p className="text-gray-400 font-light max-w-md">{t("description")}</p>
      <Link
        href="/"
        className="mt-2 px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide"
      >
        {t("backHome")}
      </Link>
    </section>
  );
}
