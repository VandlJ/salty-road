"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React from "react";

export default function Footer() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black text-white py-6 md:py-8 border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2">

        {/* Contact & Socials */}
        <div className="flex flex-row items-center justify-center gap-6 sm:gap-10 order-1 md:order-2">

          {/* Email */}
          <a
            href="mailto:info@saltyroad.cz"
            className="flex items-center gap-1.5 sm:gap-2 group text-gray-500 hover:text-gray-300 transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium tracking-wide">info@saltyroad.cz</span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/salty_road_meet/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 sm:gap-2 group text-gray-500 hover:text-gray-300 transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 sm:w-[18px] sm:h-[18px]"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span className="text-xs sm:text-sm font-medium tracking-wide">@salty_road_meet</span>
          </a>

        </div>

        {/* Copyright */}
        <div className="text-[11px] sm:text-xs text-gray-600 font-light tracking-wide text-center md:text-left flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 order-2 md:order-1">
          <span>&copy; {currentYear} {t("rights")}</span>
          <Link href="/privacy" className="underline hover:text-gray-400 transition-colors">
            {t("privacy")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
