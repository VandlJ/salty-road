import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar({ fixed = false }) {
  return (
    <nav className={`${fixed ? "fixed top-0 left-0 w-full z-30" : "w-full z-30"} flex items-center justify-between px-8 py-4 bg-gradient-to-b from-black/60 via-black/50 to-transparent border-b border-[#C0C0C0] backdrop-blur-md`}>
      {/* Logo */}
      <Image
        src="/logo_saltyroad-cropped.svg"
        alt="Salty Road Logo"
        width={64}
        height={64}
        className="h-16 w-auto"
        style={{ filter: "invert(1)" }}
      />

      {/* Tabs */}
      <div className="flex gap-8">
        <Link
          href="/"
          className="no-underline text-[#F8F7F3] font-semibold hover:text-[#C0C0C0] transition-colors duration-200"
        >
          Home
        </Link>
        <Link
          href="/gallery"
          className="no-underline text-[#F8F7F3] font-semibold hover:text-[#C0C0C0] transition-colors duration-200"
        >
          Gallery
        </Link>
        <Link
          href="/check"
          className="no-underline text-[#F8F7F3] font-semibold hover:text-[#C0C0C0] transition-colors duration-200"
        >
          Registration Check
        </Link>
      </div>

      {/* Language switch */}
      <div className="flex items-center gap-2">
        <button className="bg-transparent border-none text-[#F8F7F3] font-semibold cursor-pointer hover:text-[#C0C0C0] transition-colors duration-200">
          cs
        </button>
        <span className="text-[#C0C0C0]">/</span>
        <button className="bg-transparent border-none text-[#F8F7F3] font-semibold cursor-pointer hover:text-[#C0C0C0] transition-colors duration-200">
          en
        </button>
      </div>
    </nav>
  );
}