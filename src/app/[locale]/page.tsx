"use client";

import Hero from "@/components/hero";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    // Disable scrolling on homepage
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Cleanup function to re-enable scrolling when leaving the page
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  return (
    <div className="overflow-hidden h-screen w-screen">
      <Hero />
    </div>
  );
}