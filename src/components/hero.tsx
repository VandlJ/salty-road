"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

export default function Hero() {
  const t = useTranslations("Hero");

  const handleRegisterClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById("register");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      window.history.pushState(null, "", `${window.location.pathname}#register`);
    }
  };

  return (
    <section className="absolute inset-0 z-0 overflow-hidden">
      {/* Background Image */}
      <Image
        src="/hero.webp"
        alt="Hero Background"
        fill
        sizes="100vw"
        className="object-cover"
        priority
        // The dark overlay + blur right on top of this image (below) hides
        // compression artifacts, so a lower quality is a free byte saving.
        quality={60}
      />
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full px-4 md:px-8 overflow-hidden -translate-y-4 md:-translate-y-12">
        <div className="relative mb-0 max-w-5xl w-full">
          <Image
            src="/SaltyRoad/SRM_text.webp"
            alt="Salty Road Meet Vol. 1"
            width={1200}
            height={470}
            // Rendered inside a max-w-5xl (1024px) container — without an
            // explicit sizes hint, the browser has no way to know that and
            // defensively picks the largest available srcset candidate
            // (3840px) even on a 380px-wide mobile render.
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="w-full h-auto drop-shadow-2xl"
            priority
          />
        </div>
        <div className="relative w-full flex flex-col sm:flex-row items-center justify-center mb-2 md:mb-4 mt-4 md:mt-8 z-20">
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
        <div className="flex items-center justify-center mt-2 sm:mt-4 z-30">
          <Link href="/#register" onClick={handleRegisterClick}>
            <button className="px-8 md:px-12 py-3 md:py-4 text-base rounded-sm font-bold tracking-widest uppercase bg-white text-black shadow-2xl border-2 border-white hover:bg-gray-200 hover:text-black hover:scale-110 transition-all duration-300 cursor-pointer">
              {t("registerButton")}
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
