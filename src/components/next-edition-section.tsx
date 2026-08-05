"use client";

import { useTranslations } from "next-intl";
import SectionHeading from "@/components/section-heading";

const INSTAGRAM_URL = "https://www.instagram.com/salty_road_meet/";

// Closing CTA for the archived homepage. Deliberately no sign-up form — the
// next edition has no date yet, and ContactWidget is already available
// site-wide for anyone who wants to get in touch.
export default function NextEditionSection() {
  const t = useTranslations("ArchivePage.next");

  return (
    <section
      id="next"
      className="reveal-on-scroll bg-transparent text-white px-4 py-16 md:py-24 max-w-3xl mx-auto scroll-mt-24 text-center"
    >
      <SectionHeading className="mb-6">{t("title")}</SectionHeading>
      <p className="text-gray-200 text-base sm:text-lg leading-relaxed font-light mb-8">
        {t("text")}
      </p>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-8 py-4 rounded-sm font-bold tracking-widest uppercase bg-white text-black border-2 border-white hover:bg-gray-200 transition-colors cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
        {t("instagramCta")}
      </a>
    </section>
  );
}
