"use client";

import Hero from "@/components/hero";
import InfoSection from "@/components/info-section";
import RegistrationSection from "@/components/registration-section";
import VehiclesSection from "@/components/vehicles-section";

export default function Page() {
  return (
    <div className="w-full">
      <div className="relative h-screen w-full">
        <Hero />
      </div>
      <div className="bg-gradient-to-b from-black via-zinc-800 to-black">
        <InfoSection />
        <RegistrationSection />
        <VehiclesSection />
      </div>
    </div>
  );
}