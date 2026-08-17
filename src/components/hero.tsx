"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";
import HeroBackground from "@/components/hero-background";
import type { HeroVideo } from "@/lib/heroVideo";

// Props default to the upcoming-edition behaviour ("registration is open,
// sign up") so edition-upcoming.tsx can render a bare <Hero />;
// edition-archive.tsx overrides them to point at the gallery instead.
// Enumerated rather than a bare string so the message keys stay checkable —
// next-intl can only verify t("…") when it knows which namespace it's in.
type HeroNamespace = "Hero" | "ArchivePage.hero";

export default function Hero({
  namespace = "Hero",
  ctaKey = "registerButton",
  ctaTargetId = "register",
  heroVideo = null,
}: {
  /** Message namespace — next-intl accepts a dotted path, e.g. "ArchivePage.hero". */
  namespace?: HeroNamespace;
  /** Key within `namespace` for the CTA button label. */
  ctaKey?: "registerButton" | "galleryButton";
  /** Element id the CTA smooth-scrolls to. */
  ctaTargetId?: string;
  /** Clip chosen in /admin/hero; null falls back to the files in /public/hero. */
  heroVideo?: HeroVideo | null;
} = {}) {
  const t = useTranslations(namespace);

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById(ctaTargetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", `${window.location.pathname}#${ctaTargetId}`);
    }
  };

  return (
    <section className="absolute inset-0 z-0 overflow-hidden">
      {/* Looping clip + poster + darkening gradient */}
      <HeroBackground heroVideo={heroVideo} />
      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full px-4 md:px-8 overflow-hidden -translate-y-4 md:-translate-y-12">
        {/* The page's only h1. The visible heading is the wordmark image
            below, which no crawler and no screen reader can read as a
            heading, so the text equivalent lives here. Before this the
            homepage's single h1 was a section heading reading "Jak to
            probíhalo" — the most important heading on the page named neither
            the event, what it is, nor where it happens. */}
        <h1 className="sr-only">{t("seoHeading")}</h1>
        {/* No animation delay on this one: it is the LCP element. */}
        <div className="hero-rise relative mb-0 max-w-5xl w-full">
          <Image
            src="/SaltyRoad/SRM_text.webp"
            alt={`${t("title1")} ${t("title2")}`}
            width={1200}
            height={470}
            // Rendered inside a max-w-5xl (1024px) container — without an
            // explicit sizes hint, the browser has no way to know that and
            // defensively picks the largest available srcset candidate
            // (3840px) even on a 380px-wide mobile render.
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="w-full h-auto drop-shadow-2xl"
            // `priority` (so it is preloaded) but no longer fetchPriority
            // "high": measurement showed the hero poster is the Largest
            // Contentful Paint, not this, and two images claiming top
            // priority just made them queue behind each other.
            priority
            quality={65}
          />
        </div>
        <div className="hero-rise hero-rise-1 relative w-full flex flex-col sm:flex-row items-center justify-center mb-2 md:mb-4 mt-4 md:mt-8 z-20">
          {/* Left column - Date */}
          <div className="flex-1 flex justify-center sm:justify-end sm:pr-12 md:pr-24 mb-3 sm:mb-0">
            <div className="flex flex-col items-center group">
              <span className="text-white text-xs sm:text-xs uppercase tracking-widest font-montserrat mb-1 drop-shadow-md font-semibold">
                {t("dateLabel")}
              </span>
              <span className="text-base font-bold tracking-wide text-white drop-shadow-md">
                {t("dateValue")}
              </span>
            </div>
          </div>
          
          {/* Center separator line - hidden on mobile */}
          <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2 w-px h-12 md:h-16 bg-white shadow-lg"></div>
          
          {/* Mobile separator line */}
          <div className="block sm:hidden w-20 h-px bg-white mb-3 shadow-lg"></div>
          
          {/* Right column - Location */}
          <div className="flex-1 flex justify-center sm:justify-start sm:pl-12 md:pl-24">
            <div className="flex flex-col items-center group">
              <span className="text-white text-xs sm:text-xs uppercase tracking-widest font-montserrat mb-1 drop-shadow-md font-semibold">
                {t("locationLabel")}
              </span>
              <span className="text-base font-bold tracking-wide text-white text-center drop-shadow-md">
                {t("locationValue")}
              </span>
            </div>
          </div>
        </div>
        <div className="hero-rise hero-rise-2 flex items-center justify-center mt-2 sm:mt-4 z-30">
          <Link href={`/#${ctaTargetId}`} onClick={handleCtaClick}>
            <button className="px-8 md:px-12 py-3 md:py-4 text-base rounded-sm font-bold tracking-widest uppercase bg-white text-black shadow-2xl border-2 border-white hover:bg-gray-200 hover:text-black hover:scale-110 transition-all duration-300 cursor-pointer">
              {t(ctaKey)}
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
