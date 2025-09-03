"use client";

import Link from "next/link";
import React from "react";

export default function Hero() {
  return (
    <section className="fixed inset-0 z-0 overflow-hidden">
      {/* Background video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/background.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full px-4 md:px-8 overflow-hidden">
        <div className="relative mb-4">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent animate-gradient font-amika text-center leading-tight">
            Salty Road Meet
          </h1>
          <h2 className="absolute bottom-0 -right-2 sm:-right-10 md:-right-15 text-lg sm:text-2xl md:text-3xl lg:text-4xl drop-shadow-lg translate-y-1/2 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent animate-gradient font-amika">
            Volume 1
          </h2>
        </div>
        <div className="relative w-full flex flex-col sm:flex-row items-center justify-center mb-4 md:mb-8 mt-4 md:mt-8">
          {/* Left column - Date */}
          <div className="flex-1 flex justify-center sm:justify-end sm:pr-12 md:pr-24 mb-3 sm:mb-0">
            <div className="flex flex-col items-center group">
              <span className="text-[#C0C0C0]/60 text-xs sm:text-xs uppercase tracking-widest font-montserrat mb-1">
                Date
              </span>
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-wide bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent">
                25/07/2026
              </span>
            </div>
          </div>
          
          {/* Center separator line - hidden on mobile */}
          <div className="hidden sm:block absolute left-1/2 transform -translate-x-1/2 w-px h-12 md:h-16 bg-gradient-to-b from-transparent via-[#C0C0C0]/70 to-transparent shadow-lg"></div>
          
          {/* Mobile separator line */}
          <div className="block sm:hidden w-20 h-px bg-gradient-to-r from-transparent via-[#C0C0C0]/70 to-transparent mb-3"></div>
          
          {/* Right column - Location */}
          <div className="flex-1 flex justify-center sm:justify-start sm:pl-12 md:pl-24">
            <div className="flex flex-col items-center group">
              <span className="text-[#C0C0C0]/60 text-xs sm:text-xs uppercase tracking-widest font-montserrat mb-1">
                Location
              </span>
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-wide bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent text-center">
                Velké náměstí, Prachatice
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <Link href="/register">
            <button className="mt-6 md:mt-12 px-8 md:px-12 py-3 md:py-4 text-base md:text-lg rounded-none font-bold tracking-widest uppercase bg-gradient-to-r from-white to-[#C0C0C0] text-[#222] shadow-lg border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:text-[#444] hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer">
              Register
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
