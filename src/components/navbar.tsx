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
    router.replace(pathname, { locale: nextLocale, scroll: false });
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    closeMenu();
    if (pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `/#${targetId}`);
      }
    }
  };

  return (
    <nav
      className={`${
        fixed ? "fixed top-0 left-0 w-full z-30" : "relative w-full z-30"
      } ${
        isMenuOpen ? "bg-black" : "bg-gradient-to-b from-black/60 via-black/50 to-transparent"
      } border-b border-[#C0C0C0] backdrop-blur-md transition-all duration-300 ease-in-out`}
    >
      {/* Main navbar */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
        {/* Logo */}
        <Link
          href="/"
          className="no-underline hover:opacity-75 transition-opacity duration-200"
          onClick={(e) => {
            closeMenu();
            if (pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="flex items-center gap-1">
            <span className="text-lg md:text-2xl font-amika text-white">Salty</span>
            <Image
              src="/logo_saltyroad-cropped.svg"
              alt="Salty Road Logo"
              width={64}
              height={64}
              priority
              className="h-12 md:h-16 w-auto"
              style={{ filter: "invert(1)" }}
            />
            <span className="text-lg md:text-2xl font-amika text-white">Road</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex flex-1 justify-center items-center gap-6 px-4">
          <Link
            href="/"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            {t("home")}
          </Link>
          <Link
            href="/#info"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#info')}
          >
            {t("info")}
          </Link>
          <Link
            href="/#register"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#register')}
          >
            {t("register")}
          </Link>
          <Link
            href="/#vehicles"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#vehicles')}
          >
            {t("vehicles")}
          </Link>
          {/* <Link
            href="/shop"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
          >
            {t("shop")}
          </Link> */}
          <Link
            href="/check"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
          >
            {t("check")}
          </Link>
        </div>

        {/* Desktop Language Switch */}
        <div className="hidden lg:flex items-center gap-2 min-w-[60px] justify-end">
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
          className="lg:hidden flex flex-col items-center justify-center w-8 h-8 space-y-1 focus:outline-none"
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
        className={`lg:hidden fixed left-0 right-0 bottom-0 bg-black transition-all duration-300 ease-in-out z-40 ${
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
              href="/"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => {
                closeMenu();
                if (pathname === '/') {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
            >
              {t("home")}
            </Link>
            <Link
              href="/#info"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#info')}
            >
              {t("info")}
            </Link>
            <Link
              href="/#register"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#register')}
            >
              {t("register")}
            </Link>
            <Link
              href="/#vehicles"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#vehicles')}
            >
              {t("vehicles")}
            </Link>
            {/* <Link
              href="/shop"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={closeMenu}
            >
              {t("shop")}
            </Link> */}
            <Link
              href="/check"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={closeMenu}
            >
              {t("check")}
            </Link>

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