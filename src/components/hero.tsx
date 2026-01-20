"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

export default function Hero() {
  const t = useTranslations("Hero");
  return (
    <section className="absolute inset-0 z-0 overflow-hidden">
      {/* Background video - commented out
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      */}
      {/* Background Image */}
      <Image
        src="/hero.jpg"
        alt="Hero Background"
        fill
        className="object-cover"
        priority
      />
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full px-4 md:px-8 overflow-hidden -translate-y-4 md:-translate-y-12">
        <div className="relative mb-0 max-w-5xl w-full">
          {/* Heading text - commented out
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent animate-gradient font-amika text-center leading-tight">
            {t("title1")}
          </h1>
          <h2 className="absolute bottom-0 -right-2 sm:-right-10 md:-right-15 text-lg sm:text-2xl md:text-3xl lg:text-4xl drop-shadow-lg translate-y-1/2 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent animate-gradient font-amika">
            {t("title2")}
          </h2>
          */}
          <Image
            src="/SaltyRoad/SRM_text.png"
            alt="Salty Road Meet Vol. 1"
            width={1200}
            height={600}
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
          <Link href="/#register">
            <button className="px-8 md:px-12 py-3 md:py-4 text-base rounded-none font-bold tracking-widest uppercase bg-white text-black shadow-2xl border-2 border-white hover:bg-gray-200 hover:text-black hover:scale-110 transition-all duration-300 cursor-pointer">
              {t("registerButton")}
            </button>
          </Link>
        </div>
      </div>
      {/* Gradient animation keyframes */}
      <style jsx>{`
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientMove 4s ease-in-out infinite;
        }
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </section>
  );
}
