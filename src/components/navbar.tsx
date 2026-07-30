"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import CartLink from "@/components/cart-link";

// Shop nav entries are hidden in production until the shop is ready to
// launch, but visible in dev so it can still be worked on / QA'd.
const SHOP_VISIBLE = process.env.NODE_ENV === "development";

export default function Navbar({ fixed = false }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleMenu = () => setIsMenuOpen((open) => !open);
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    // `body { overflow: hidden }` alone doesn't reliably block touch-driven
    // scroll on mobile Safari (rubber-band can still drag the page), so the
    // lock is applied to both html and body plus overscroll-behavior.
    const html = document.documentElement;
    const body = document.body;
    if (isMenuOpen) {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
    } else {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overflow = "";
      body.style.overscrollBehavior = "";
    }
    return () => {
      html.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overflow = "";
      body.style.overscrollBehavior = "";
    };
  }, [isMenuOpen]);

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
    <>
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
          {/* Hidden in production until the shop launches — SHOP_VISIBLE keeps it up in dev. */}
          {SHOP_VISIBLE && (
            <Link
              href="/shop"
              className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            >
              {t("shop")}
            </Link>
          )}
          <Link
            href="/check"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
          >
            {t("check")}
          </Link>
        </div>

        {/* Desktop Cart + Language Switch */}
        <div className="hidden lg:flex items-center gap-4 min-w-[60px] justify-end">
          {SHOP_VISIBLE && <CartLink />}
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchLocale('cs')}
              aria-label="Přepnout na češtinu"
              aria-current={locale === 'cs' ? 'true' : undefined}
              className={`bg-transparent border-none font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 ${locale === 'cs' ? 'text-white' : 'text-gray-400'}`}
            >
              cs
            </button>
            <span className="text-white" aria-hidden="true">/</span>
            <button
              onClick={() => switchLocale('en')}
              aria-label="Switch to English"
              aria-current={locale === 'en' ? 'true' : undefined}
              className={`bg-transparent border-none font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 ${locale === 'en' ? 'text-white' : 'text-gray-400'}`}
            >
              en
            </button>
          </div>
        </div>

        {/* Mobile Cart + Burger Menu Button */}
        <div className="lg:hidden flex items-center gap-4">
          {SHOP_VISIBLE && <CartLink onClick={closeMenu} />}
          <button
            onClick={toggleMenu}
            className="flex flex-col items-center justify-center w-8 h-8 space-y-1 focus:outline-none"
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
      </div>
    </nav>

    {/* Mobile Menu Overlay — rendered outside <nav> so its fixed positioning
        resolves against the real viewport, not nav's backdrop-blur
        containing block (which used to collapse its own box to 0 height
        and leak the panel's height into the page's scroll height). */}
    <div
      className={`lg:hidden fixed inset-x-0 top-[73px] bottom-0 overflow-hidden bg-black transition-opacity duration-300 ease-in-out z-40 ${
        isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
      onClick={closeMenu}
    >
      <div
        className={`bg-black px-6 pt-2 h-full flex flex-col transition-transform duration-300 ease-in-out ${
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
            {SHOP_VISIBLE && (
              <Link
                href="/shop"
                className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
                onClick={closeMenu}
              >
                {t("shop")}
              </Link>
            )}
            <Link
              href="/check"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={closeMenu}
            >
              {t("check")}
            </Link>
          </div>

          {/* Mobile Language Switch — pinned to the bottom of the panel */}
          <div className="mt-auto flex items-center justify-center gap-4 pb-12">
            <button
              onClick={() => switchLocale('cs')}
              aria-label="Přepnout na češtinu"
              aria-current={locale === 'cs' ? 'true' : undefined}
              className={`bg-transparent border-none text-lg font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 px-4 py-2 ${locale === 'cs' ? 'text-white' : 'text-gray-400'}`}
            >
              cs
            </button>
            <span className="text-white text-lg" aria-hidden="true">/</span>
            <button
              onClick={() => switchLocale('en')}
              aria-label="Switch to English"
              aria-current={locale === 'en' ? 'true' : undefined}
              className={`bg-transparent border-none text-lg font-semibold cursor-pointer hover:text-gray-300 transition-colors duration-200 px-4 py-2 ${locale === 'en' ? 'text-white' : 'text-gray-400'}`}
            >
              en
            </button>
          </div>
        </div>
      </div>
    </>
  );
}