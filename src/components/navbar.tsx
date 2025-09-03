import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar({ fixed = false }) {
  return (
    <nav
      className={`${
        fixed ? "fixed top-0 left-0 w-full z-30" : "w-full z-30"
      } flex items-center px-8 py-4 bg-gradient-to-b from-black/60 via-black/50 to-transparent border-b border-[#C0C0C0] backdrop-blur-md relative`}
    >
      {/* Logo */}
      <Link
        href="/"
        className="no-underline hover:opacity-75 transition-opacity duration-200"
      >
        <div className="flex items-center gap-1">
          <span className="text-2xl font-amika text-white">Salty</span>
          <Image
            src="/logo_saltyroad-cropped.svg"
            alt="Salty Road Logo"
            width={64}
            height={64}
            className="h-16 w-auto"
            style={{ filter: "invert(1)" }}
          />
          <span className="text-2xl font-amika text-white">Road</span>
        </div>
      </Link>

      {/* Tabs - absolutely positioned to center of screen */}
      <div className="absolute left-1/2 transform -translate-x-1/2 flex gap-8">
        <Link
          href="/vehicles"
          className="no-underline text-[#F8F7F3] font-semibold hover:text-[#C0C0C0] transition-colors duration-200"
        >
          Registered Vehicles
        </Link>
        <Link
          href="/check"
          className="no-underline text-[#F8F7F3] font-semibold hover:text-[#C0C0C0] transition-colors duration-200"
        >
          Registration Check
        </Link>
      </div>

      {/* Language switch */}
      <div className="flex items-center gap-2 ml-auto">
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
