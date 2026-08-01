"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import SectionHeading from "@/components/section-heading";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("ErrorPage");

  useEffect(() => {
    console.error(error);
  }, [error]);

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
      <SectionHeading as="h1" size="lg">
        {t("title")}
      </SectionHeading>
      <p className="text-gray-400 font-light max-w-md">{t("description")}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2 bg-white text-black rounded-sm border-2 border-white hover:bg-gray-200 transition-all duration-200 font-bold uppercase tracking-wide cursor-pointer"
        >
          {t("retry")}
        </button>
        <Link
          href="/"
          className="px-6 py-2 bg-transparent text-white rounded-sm border-2 border-white hover:bg-white hover:text-black transition-all duration-200 font-bold uppercase tracking-wide"
        >
          {t("backHome")}
        </Link>
      </div>
    </section>
  );
}
