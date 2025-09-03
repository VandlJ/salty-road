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
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center w-full">
        <h1 className="text-9xl font-extrabold mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent animate-gradient font-amika">
          Salty Road 
        </h1>
        <p className="text-lg text-white/90 mb-6 drop-shadow-lg">
          This is a placeholder for the event description.
        </p>
        <div className="flex flex-row items-center justify-center gap-6 mb-8">
          <span className="text-white/80 text-base">Date: 25/07/2026</span>
          <span className="text-white/80 text-base">
            Place: Velké náměstí, Prachatice
          </span>
        </div>
        <div className="flex items-center justify-center">
          <Link href="/register">
            <button className="mt-4 px-8 py-3 rounded-none font-bold tracking-widest uppercase bg-gradient-to-r from-white to-[#C0C0C0] text-[#222] shadow-lg border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:text-[#444] hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer">
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
