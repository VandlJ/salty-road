"use client";

import Hero from "@/components/hero";
import InfoSection from "@/components/info-section";
import RegistrationSection from "@/components/registration-section";
import VehiclesSection from "@/components/vehicles-section";
import SponsorsSection from "@/components/sponsors-section";

export default function Page() {
  return (
    <div className="w-full">
      <div className="relative h-screen w-full">
        <Hero />
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700" />
      <div className="bg-black">
        <InfoSection />
        <RegistrationSection />
        <VehiclesSection />
        <SponsorsSection />
      </div>
    </div>
  );
}