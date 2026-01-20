"use client";

import { useTranslations } from "next-intl";
import React from "react";

export default function Footer() {
  const t = useTranslations("Footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black text-white py-12 border-t border-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-0">
        
        {/* Left: Copyright */}
        <div className="text-sm sm:text-base text-gray-400 font-light tracking-wide text-center md:text-left">
          &copy; {currentYear} {t("rights")}
        </div>

        {/* Center/Right: Contact & Socials */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-12">
          
          {/* Email */}
          <div className="flex items-center gap-2 group hover:text-gray-200 transition-colors duration-300">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors duration-300" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <a href="mailto:info@saltyroad.cz" className="text-sm sm:text-base font-medium tracking-wide">
              info@saltyroad.cz
            </a>
          </div>

          {/* Instagram */}
          <div className="flex items-center gap-2 group hover:text-gray-200 transition-colors duration-300">
             <a 
              href="https://www.instagram.com/salty_road_meet/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-gray-400 group-hover:text-white transition-colors duration-300"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span className="text-sm sm:text-base font-medium tracking-wide">@salty_road_meet</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
