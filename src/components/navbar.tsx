"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations, type Locale } from "next-intl";
import CartLink from "@/components/cart-link";

// Only ids that have a matching nav link belong here — the scroll-spy moves
// the indicator to whatever it sees, and a spied section with no link makes
// it vanish mid-scroll. #next is deliberately absent for that reason.
const HOME_SECTION_IDS = ["recap", "gallery", "vehicles"];

export default function Navbar({ fixed = false, initialShopVisible = false }: { fixed?: boolean; initialShopVisible?: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // Admin-controlled kill switch (Merch admin page) — declared here (ahead
  // of its own effect further down) because the indicator-measuring effect
  // below needs it in its dependency array.
  const [shopVisible, setShopVisible] = useState(initialShopVisible);

  // Sliding active-link indicator (desktop nav only). "home"/"info"/
  // "register"/"vehicles" are scroll-spied on the homepage; "shop"/"check"
  // are matched by pathname on their own routes.
  const [activeId, setActiveId] = useState("home");
  const navRowRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  // While a nav-click-triggered smooth scroll is in flight, the scroll-spy
  // IntersectionObserver below fires for every section it passes through
  // (not just the destination), yanking the indicator back and forth before
  // settling. Suppress the observer until the scroll actually stops.
  const suppressSpyRef = useRef(false);
  const suppressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginProgrammaticScroll = useCallback(() => {
    suppressSpyRef.current = true;
    if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
  }, []);

  useEffect(() => {
    // `scrollend` covers modern browsers; the debounced scroll fallback
    // below covers Safari versions that don't support it yet — both just
    // clear the same flag, so having both is harmless.
    const clearSuppress = () => {
      suppressSpyRef.current = false;
    };
    const onScroll = () => {
      if (!suppressSpyRef.current) return;
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
      suppressTimeoutRef.current = setTimeout(clearSuppress, 150);
    };
    window.addEventListener("scrollend", clearSuppress);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scrollend", clearSuppress);
      window.removeEventListener("scroll", onScroll);
      if (suppressTimeoutRef.current) clearTimeout(suppressTimeoutRef.current);
    };
  }, []);

  const measureIndicator = useCallback(() => {
    const row = navRowRef.current;
    const link = linkRefs.current[activeId];
    if (!row || !link) {
      setIndicator(null);
      return;
    }
    const rowRect = row.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    setIndicator({ left: linkRect.left - rowRect.left, width: linkRect.width });
  }, [activeId]);

  useEffect(() => {
    measureIndicator();
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
    // shopVisible changes which links exist, shifting everything after
    // it — re-measure so the indicator doesn't end up under the wrong link.
  }, [measureIndicator, shopVisible]);

  // Match "shop" (or any future non-homepage nav route) by pathname.
  // Anything else (admin, entry, check, privacy, a 404, ...) has no
  // corresponding nav link, so the indicator should hide rather than default
  // to "home".
  /* eslint-disable react-hooks/set-state-in-effect -- derives the active
     nav indicator from the current route, not a render-cascade loop. */
  useEffect(() => {
    if (pathname.startsWith("/shop")) setActiveId("shop");
    else if (pathname === "/") setActiveId((current) => (HOME_SECTION_IDS.includes(current) ? current : "home"));
    else setActiveId("");
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Scroll-spy the homepage sections so the indicator follows scroll
  // position, not just clicks.
  useEffect(() => {
    if (pathname !== "/") return;
    const sections = HOME_SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    // No raw `window.addEventListener("scroll")` — IntersectionObserver
    // handles both directions: entering a section activates it, and
    // exiting the first section upward (scrolling back toward the hero)
    // falls back to "home" instead of leaving the indicator stuck on the
    // last section.
    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressSpyRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          } else if (entry.target.id === HOME_SECTION_IDS[0] && entry.boundingClientRect.top > 0) {
            setActiveId("home");
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  // Off by default until the shop is ready to launch. Polled + refetched on
  // tab focus so a toggle in another tab (or the admin panel itself) shows
  // up without a manual page reload.
  useEffect(() => {
    const fetchShopStatus = () => {
      fetch("/api/shop-status", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          const next = !!data.enabled;
          // Only update when the value actually changed — shopVisible is a
          // dependency of the indicator-measuring effect below, so setting
          // it unconditionally on every 15s tick forces a needless
          // getBoundingClientRect() reflow even when nothing changed.
          setShopVisible((prev) => (prev === next ? prev : next));
        })
        .catch(() => {});
    };
    fetchShopStatus();
    const interval = setInterval(fetchShopStatus, 15000);
    window.addEventListener("focus", fetchShopStatus);
    window.addEventListener("shop-status-changed", fetchShopStatus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchShopStatus);
      window.removeEventListener("shop-status-changed", fetchShopStatus);
    };
  }, []);

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

  const switchLocale = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale, scroll: false });
  };

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    closeMenu();
    if (pathname === '/') {
      e.preventDefault();
      const targetId = href.replace('/#', '');
      const element = document.getElementById(targetId);
      if (element) {
        beginProgrammaticScroll();
        element.scrollIntoView({ behavior: 'smooth' });
        // Preserve the locale prefix (e.g. /cs, /en) — a hardcoded `/#id`
        // here used to strip it, desyncing the browser URL from Next's
        // router state and silently breaking later same-page hash links.
        window.history.pushState(null, '', `${window.location.pathname}#${targetId}`);
        // Instant feedback — don't wait for the scroll-spy IntersectionObserver
        // to catch up once the smooth scroll settles.
        setActiveId(targetId);
      }
    }
  };

  const scrollToTop = () => {
    beginProgrammaticScroll();
    setActiveId('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Clear any leftover #section hash from a previous in-page nav click,
    // so it doesn't desync the browser URL from the actual scroll position.
    window.history.pushState(null, '', window.location.pathname);
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
              scrollToTop();
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
        <div ref={navRowRef} className="hidden lg:flex flex-1 justify-center items-center gap-6 px-4 relative pb-1">
          <Link
            ref={(el) => { linkRefs.current.home = el; }}
            href="/"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault();
                scrollToTop();
              }
            }}
          >
            {t("home")}
          </Link>
          <Link
            ref={(el) => { linkRefs.current.recap = el; }}
            href="/#recap"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#recap')}
          >
            {t("recap")}
          </Link>
          <Link
            ref={(el) => { linkRefs.current.gallery = el; }}
            href="/#gallery"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#gallery')}
          >
            {t("gallery")}
          </Link>
          <Link
            ref={(el) => { linkRefs.current.vehicles = el; }}
            href="/#vehicles"
            className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
            onClick={(e) => handleScroll(e, '/#vehicles')}
          >
            {t("vehicles")}
          </Link>
          {shopVisible && (
            <Link
              ref={(el) => { linkRefs.current.shop = el; }}
              href="/shop"
              className="no-underline text-white font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 text-xs lg:text-sm whitespace-nowrap"
              onClick={() => setActiveId('shop')}
            >
              {t("shop")}
            </Link>
          )}

          {/* Sliding active-link indicator — position/width are measured
              from the active link's real DOM rect (see measureIndicator),
              animated purely via CSS transition on left/width. */}
          {indicator && (
            <span
              aria-hidden="true"
              className="absolute bottom-0 h-[2px] bg-brand transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
        </div>

        {/* Desktop Cart + Language Switch */}
        <div className="hidden lg:flex items-center gap-4 min-w-[60px] justify-end">
          {shopVisible && <CartLink />}
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
          {shopVisible && <CartLink onClick={closeMenu} />}
          <button
            onClick={toggleMenu}
            className="flex flex-col items-center justify-center w-8 h-8 space-y-1 focus:outline-none"
            aria-label={t("toggleMenu")}
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
                  scrollToTop();
                }
              }}
            >
              {t("home")}
            </Link>
            <Link
              href="/#recap"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#recap')}
            >
              {t("recap")}
            </Link>
            <Link
              href="/#gallery"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#gallery')}
            >
              {t("gallery")}
            </Link>
            <Link
              href="/#vehicles"
              className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
              onClick={(e) => handleScroll(e, '/#vehicles')}
            >
              {t("vehicles")}
            </Link>
            {shopVisible && (
              <Link
                href="/shop"
                className="no-underline text-white text-lg font-semibold uppercase tracking-wide hover:text-gray-300 transition-colors duration-200 py-3 border-b border-gray-600"
                onClick={closeMenu}
              >
                {t("shop")}
              </Link>
            )}
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