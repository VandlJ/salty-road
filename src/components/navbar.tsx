"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";

export default function Navbar({ fixed = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const switchLocale = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <nav
      className={`${
        fixed ? "fixed top-0 left-0 w-full z-30" : "w-full z-30"
      } ${
        isMenuOpen ? "bg-black" : "bg-gradient-to-b from-black/60 via-black/50 to-transparent"
      } border-b border-[#C0C0C0] backdrop-blur-md relative transition-all duration-300 ease-in-out`}
    >
      {/* Main navbar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="no-underline hover:opacity-75 transition-opacity duration-200"
          onClick={closeMenu}
        >
          <div className="flex items-center gap-1">
            <span className="text-lg md:text-2xl font-amika text-white">Salty</span>
            <Image
              src="/logo_saltyroad-cropped.svg"
              alt="Salty Road Logo"
              width={64}
              height={64}
              className="h-12 md:h-16 w-auto"
              style={{ filter: "invert(1)" }}
            />
            <span className="text-lg md:text-2xl font-amika text-white">Road</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-8 absolute left-1/2 transform -translate-x-1/2 items-center">
          <Link
            href="/vehicles"
            className="no-underline text-white font-semibold hover:text-gray-300 transition-colors duration-200"
          >
            {t("vehicles")}
          </Link>
          <Link
            href="/check"
            className="no-underline text-white font-semibold hover:text-gray-300 transition-colors duration-200"
          >
            {t("check")}
          </Link>
          <Link
            href="/info"
            className="no-underline text-white font-semibold hover:text-gray-300 transition-colors duration-200"
          >
            {t("info")}
          </Link>
        </div>

        {/* Desktop Language Switch */}
        <div className="hidden md:flex items-center gap-2">
          <button 
            onClick={() => switchLocale('cs')}
            className={`bg-transparent border-none font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 ${locale === 'cs' ? 'text-gray-400' : 'text-white'}`}
          >
            cs
          </button>
          <span className="text-white">/</span>
          <button 
            onClick={() => switchLocale('en')}
            className={`bg-transparent border-none font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 ${locale === 'en' ? 'text-gray-400' : 'text-white'}`}
          >
            en
          </button>
        </div>

        {/* Mobile Burger Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1 focus:outline-none"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-in-out ${
              isMenuOpen ? "rotate-45 translate-y-1.5" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-in-out ${
              isMenuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-white transition-all duration-300 ease-in-out ${
              isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
            }`}
          ></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed left-0 right-0 bottom-0 bg-black transition-all duration-300 ease-in-out z-40 ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        style={{ top: "calc(100% + 0px)" }}
        onClick={closeMenu}
      >
        <div
          className={`bg-black min-h-screen px-6 pt-2 transition-all duration-300 ease-in-out ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Navigation Links */}
          <div className="flex flex-col space-y-4 text-center mt-8">
            <Link
              href="/vehicles"
              className="no-underline text-white text-xl font-semibold hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={closeMenu}
            >
              {t("vehicles")}
            </Link>
            <Link
              href="/check"
              className="no-underline text-white text-xl font-semibold hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={closeMenu}
            >
              {t("check")}
            </Link>
            
            {/* Mobile Information Section */}
            <div className="py-2 border-b border-gray-600">
              <span className="block text-gray-300 text-sm uppercase tracking-widest mb-4">{t("info")}</span>
              <div className="flex flex-col gap-4 pl-4">
                 <Link href="/info#parking" onClick={closeMenu} className="text-white text-lg hover:text-gray-300">{t("parking")}</Link>
                 <Link href="/info#map" onClick={closeMenu} className="text-white text-lg hover:text-gray-300">{t("map")}</Link>
                 <Link href="/info#sponsors" onClick={closeMenu} className="text-white text-lg hover:text-gray-300">{t("sponsors")}</Link>
                 <Link href="/info#program" onClick={closeMenu} className="text-white text-lg hover:text-gray-300">{t("program")}</Link>
                 <Link href="/info#rules" onClick={closeMenu} className="text-white text-lg hover:text-gray-300">{t("rules")}</Link>
              </div>
            </div>

            {/* Mobile Language Switch */}
            <div className="flex items-center justify-center gap-4 pt-8 pb-12">
              <button 
                onClick={() => switchLocale('cs')}
                className={`bg-transparent border-none text-lg font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 px-4 py-2 ${locale === 'cs' ? 'text-gray-400' : 'text-white'}`}
              >
                cs
              </button>
              <span className="text-white text-lg">/</span>
              <button 
                onClick={() => switchLocale('en')}
                className={`bg-transparent border-none text-lg font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 px-4 py-2 ${locale === 'en' ? 'text-gray-400' : 'text-white'}`}
              >
                en
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
